import { BaseBankParser } from './base.parser';
import { BankCode, ParsedTransaction, RawEmailData, TransactionType } from '../types';

export class BhdParser extends BaseBankParser {
  bankCode: BankCode = 'BHD';
  bankName: string = 'Banco BHD';

  canParse(email: RawEmailData): boolean {
    const from = (email.from || '').toLowerCase();
    const subject = (email.subject || '').toLowerCase();
    const body = (email.bodySnippet || '').toLowerCase();

    return (
      from.includes('bhd.com.do') ||
      from.includes('bhdleon.com.do') ||
      subject.includes('bhd') ||
      body.includes('banco bhd')
    );
  }

  parse(email: RawEmailData): ParsedTransaction | null {
    const fullText = this.cleanText((email.bodyHtml || '') + '\n' + (email.bodyText || '') + '\n' + (email.bodySnippet || ''));
    const subject = email.subject || '';

    // Transaction Type
    let type: TransactionType = 'EXPENSE';
    if (/crédito|credito|depósito|deposito|transferencia recibida|abono/i.test(subject) || /se ha acreditado|depósito en su cuenta/i.test(fullText)) {
      type = 'INCOME';
    } else if (/pago de tarjeta|transferencia entre/i.test(subject)) {
      type = 'TRANSFER';
    }

    // Extract Amount & Currency
    let amount = 0;
    let currency: 'DOP' | 'USD' = 'DOP';

    // 1. Labeled field: "Monto: RD$ XXX" or "Valor: RD$ XXX"
    const labeledMatch = fullText.match(/(?:monto|valor|importe|por la suma de|consumo de)\s*:\s*(?:RD\$|USD|US\$|\$|DOP)?\s*([0-9,.]+)/i);
    if (labeledMatch) {
      const parsed = this.parseAmountAndCurrency(labeledMatch[0]);
      if (parsed) {
        amount = parsed.amount;
        currency = parsed.currency;
      }
    }

    // 2. Currency with amount
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

    // Extract Merchant / Destination
    let merchant = '';

    if (/cargo por servicio|notificaci[oó]n sms|comisi[oó]n/i.test(fullText) || /notificaci[oó]n sms/i.test(subject)) {
      merchant = 'Cargo por Notificación SMS';
    }

    if (!merchant) {
      const labeledMerchant = fullText.match(/(?:comercio|establecimiento|negocio|beneficiario|a favor de)\s*:\s*([^\n\r<]{3,80})/i);
      if (labeledMerchant && labeledMerchant[1]) {
        merchant = this.cleanMerchantName(labeledMerchant[1]);
      }
    }

    if (!merchant) {
      const inlineMatch = fullText.match(/(?:consumo en|compra en|pago a|debito por|débito por)\s+([^,\n\r<]{3,60}?)(?:\s+por|\s+con|\s+el|\s+en\s+fecha|\.|\,|$)/i);
      if (inlineMatch && inlineMatch[1]) {
        merchant = this.cleanMerchantName(inlineMatch[1]);
      }
    }

    if (!merchant || merchant.length < 2) {
      if (type === 'INCOME') {
        merchant = 'Depósito / Abono BHD';
      } else {
        merchant = 'Consumo Tarjeta BHD';
      }
    }

    // Account or Card reference
    let accountReference: string | undefined = undefined;
    const cardMatch = fullText.match(/(?:tarjeta|producto|cuenta|cta)\s*(?:terminada en|no\.|n[uú]mero|\*+)?\s*[:\*\.\s]*([0-9X\*]{4,16})/i);
    if (cardMatch && cardMatch[1]) {
      const digits = cardMatch[1].replace(/[^0-9]/g, '').slice(-4);
      if (digits) {
        accountReference = `BHD ...${digits}`;
      }
    }

    const date = this.parseDate(fullText, email.date);

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
