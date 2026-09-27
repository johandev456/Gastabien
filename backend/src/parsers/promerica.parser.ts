import { BaseBankParser } from './base.parser';
import { BankCode, ParsedTransaction, RawEmailData, TransactionType } from '../types';

export class PromericaParser extends BaseBankParser {
  bankCode: BankCode = 'PROMERICA';
  bankName: string = 'Banco Promerica';

  canParse(email: RawEmailData): boolean {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.bodySnippet || '').toLowerCase();

    return (
      from.includes('promerica.com.do') ||
      subject.includes('promerica') ||
      body.includes('banco promerica') ||
      body.includes('promerica club')
    );
  }

  parse(email: RawEmailData): ParsedTransaction | null {
    const fullText = this.cleanText((email.bodyHtml || '') + '\n' + (email.bodyText || '') + '\n' + (email.bodySnippet || ''));
    const subject = email.subject || '';

    // Determine type
    let type: TransactionType = 'EXPENSE';
    const isIncome = (
      /dep[oó]sito|cr[eé]dito|transferencia recibida|abono|n[oó]mina|sueldo|salario|pago recibido/i.test(subject) ||
      /n[oó]mina|sueldo|salario|dep[oó]sito|deposito|cr[eé]dito\s*en\s*cuenta|acreditad[oa]|ha sido acreditado|abono de|abono a|transferencia recibida|dep[oó]sito recibido/i.test(fullText)
    );

    const isWithdrawal = (
      /transacci[oó]n\s*atm|retiro\s*en\s*cajero|retiro\s*de\s*efectivo|cajero\s*autom[aá]tico|retiro\s*atm|dispensaci[oó]n|\batm\b/i.test(subject) ||
      /transacci[oó]n\s*atm|retiro\s*en\s*cajero|retiro\s*de\s*efectivo|cajero\s*autom[aá]tico|cajero\s*automatico|retiro\s*atm|dispensaci[oó]n\s*(?:de\s*)?efectivo|\batm\b/i.test(fullText)
    );

    if (isWithdrawal) {
      type = 'EXPENSE';
    } else if (isIncome) {
      type = 'INCOME';
    } else if (/pago de tarjeta/i.test(subject)) {
      type = 'TRANSFER';
    }

    // Extract amount
    let amount = 0;
    let currency: 'DOP' | 'USD' = 'DOP';

    // 1. Look for labeled field: "Monto: RD$ XXX" or "Importe: RD$ XXX"
    const labeledAmountMatch = fullText.match(/(?:monto|importe|valor|transacci[oó]n por|consumo por|retiro por|dep[oó]sito por)\s*:\s*(?:RD\$|USD|US\$|\$|DOP)?\s*([0-9,.]+)/i);
    if (labeledAmountMatch) {
      const parsed = this.parseAmountAndCurrency(labeledAmountMatch[0]);
      if (parsed) {
        amount = parsed.amount;
        currency = parsed.currency;
      }
    }

    // 2. Fallback: look for currency symbol with amount (e.g. RD$ 146.44 or US$ 15.99)
    if (amount <= 0) {
      const currencyMatches = fullText.match(/(?:RD\$|US\$|USD|DOP)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?|[0-9]+(?:\.[0-9]{2})?)/gi);
      if (currencyMatches) {
        for (const matchStr of currencyMatches) {
          const parsed = this.parseAmountAndCurrency(matchStr);
          if (parsed && parsed.amount > 0) {
            amount = parsed.amount;
            currency = parsed.currency;
            break;
          }
        }
      }
    }

    if (amount <= 0) return null;

    // Extract Date
    const date = this.parseDate(fullText, email.date);
    const parsedDateObj = new Date(date);
    const dayOfMonth = parsedDateObj.getDate();

    // Extract Merchant / Description
    let merchant = '';

    // A. Handle ATM Withdrawals
    if (isWithdrawal) {
      const atmLocMatch = fullText.match(/(?:cajero|atm|ubicaci[oó]n)\s*:\s*([^\n\r<]{3,60})/i);
      if (atmLocMatch && atmLocMatch[1]) {
        merchant = `Retiro en Cajero (${this.cleanMerchantName(atmLocMatch[1])})`;
      } else {
        merchant = 'Retiro en Cajero Automático (ATM)';
      }
    }
    // B. Handle Incomes & Paydays (Días 15 y 30 / fin de mes)
    else if (isIncome) {
      const isPayday = (dayOfMonth >= 14 && dayOfMonth <= 16) || (dayOfMonth >= 28 && dayOfMonth <= 31) || dayOfMonth === 1;
      
      const originMatch = fullText.match(/(?:de|origen|ordenante|remitente|empresa)\s*:\s*([^\n\r<]{3,60})/i);
      if (originMatch && originMatch[1]) {
        const origin = this.cleanMerchantName(originMatch[1]);
        merchant = `Ingreso de Nómina - ${origin}`;
      } else if (isPayday || /n[oó]mina|sueldo/i.test(fullText)) {
        merchant = dayOfMonth <= 16 
          ? 'Nómina Quincenal (Día 15) - Promerica' 
          : 'Nómina Quincenal (Día 30) - Promerica';
      } else {
        merchant = 'Depósito / Transferencia Recibida';
      }
    }
    // C. Check SMS alert fee
    else if (/notificaci[oó]n\s*sms|alerta\s*sms|cargo\s*por\s*servicio|comisi[oó]n/i.test(fullText) || /notificaci[oó]n\s*sms/i.test(subject)) {
      merchant = 'Cargo por Notificación SMS';
    }
    // D. Standard Merchant Extraction
    else {
      const lineMatches = fullText.match(/(?:comercio|establecimiento|lugar|negocio)\s*:\s*([^\n\r<]{3,80})/i);
      if (lineMatches && lineMatches[1]) {
        merchant = this.cleanMerchantName(lineMatches[1]);
      }

      if (!merchant) {
        const inlineMatch = fullText.match(/(?:consumo en|compra en|realizada en)\s+([^,\n\r<]{3,60}?)(?:\s+por|\s+con|\s+el|\s+en\s+fecha|\.|\,|$)/i);
        if (inlineMatch && inlineMatch[1]) {
          merchant = this.cleanMerchantName(inlineMatch[1]);
        }
      }

      if (!merchant || merchant.length < 2) {
        if (amount <= 10) {
          merchant = 'Cargo por Notificación SMS';
        } else {
          merchant = 'Consumo Tarjeta Promerica';
        }
      }
    }

    // Extract card reference
    let accountReference: string | undefined = undefined;
    const cardMatch = fullText.match(/(?:tarjeta|cta|cuenta|producto)\s*(?:terminada en|no\.|n[uú]mero|\*+)?\s*[:\*\.\s]*([0-9X\*]{4,16})/i);
    if (cardMatch && cardMatch[1]) {
      const digits = cardMatch[1].replace(/[^0-9]/g, '').slice(-4);
      if (digits) {
        accountReference = `Promerica ...${digits}`;
      }
    }

    return {
      externalId: email.id,
      bank: this.bankCode,
      bankName: this.bankName,
      type,
      amount,
      currency,
      merchant,
      accountReference,
      date,
      rawSubject: email.subject,
      rawSender: email.from,
      description: fullText.substring(0, 150)
    };
  }
}
