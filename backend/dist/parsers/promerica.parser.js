"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromericaParser = void 0;
const base_parser_1 = require("./base.parser");
const date_1 = require("../utils/date");
class PromericaParser extends base_parser_1.BaseBankParser {
    bankCode = 'PROMERICA';
    bankName = 'Banco Promerica';
    canParse(email) {
        const from = (email.from || '').toLowerCase();
        const subject = (email.subject || '').toLowerCase();
        const body = (email.bodySnippet || '').toLowerCase();
        return (from.includes('promerica.com.do') ||
            subject.includes('promerica') ||
            body.includes('banco promerica') ||
            body.includes('promerica club'));
    }
    parse(email) {
        const fullText = this.cleanText((email.bodyHtml || '') + '\n' + (email.bodyText || '') + '\n' + (email.bodySnippet || ''));
        const subject = email.subject || '';
        // Determine type
        let type = 'EXPENSE';
        const typeSubject = this.stripCardProductNames(subject);
        const typeText = this.stripCardProductNames(fullText);
        const isPurchase = /consumo|compra|cargo|d[eé]bito/i.test(typeSubject) ||
            /\b(?:consumo|compra|cargo)\s+(?:por|en|de)\b/i.test(typeText);
        // Body keywords must describe money coming IN (a bare "depósito" can appear in disclaimers)
        const isIncome = !isPurchase && (/dep[oó]sito|cr[eé]dito|transferencia recibida|abono|n[oó]mina|sueldo|salario|pago recibido/i.test(typeSubject) ||
            /n[oó]mina|sueldo|salario|cr[eé]dito\s*en\s*cuenta|ha sido acreditad[oa]|acreditad[oa]\s+(?:a|en)\s+su|abono de|abono a|transferencia recibida|dep[oó]sito recibido|dep[oó]sito\s+(?:a|en)\s+su\s+cuenta/i.test(typeText));
        const isWithdrawal = (/transacci[oó]n\s*atm|retiro\s*en\s*cajero|retiro\s*de\s*efectivo|cajero\s*autom[aá]tico|retiro\s*atm|dispensaci[oó]n|\batm\b/i.test(subject) ||
            /transacci[oó]n\s*atm|retiro\s*en\s*cajero|retiro\s*de\s*efectivo|cajero\s*autom[aá]tico|cajero\s*automatico|retiro\s*atm|dispensaci[oó]n\s*(?:de\s*)?efectivo|\batm\b/i.test(fullText));
        if (isWithdrawal) {
            type = 'EXPENSE';
        }
        else if (isIncome) {
            type = 'INCOME';
        }
        else if (/pago de tarjeta/i.test(subject)) {
            type = 'TRANSFER';
        }
        // Extract amount
        let amount = 0;
        let currency = 'DOP';
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
            const found = this.findCurrencyAmount(fullText);
            if (found) {
                amount = found.amount;
                currency = found.currency;
            }
        }
        if (amount <= 0)
            return null;
        // Extract Date
        const date = this.parseDate(fullText, email.date);
        const parsedDateObj = new Date(date);
        const dayOfMonth = (0, date_1.drDayOfMonth)(parsedDateObj);
        // Extract Merchant / Description
        let merchant = '';
        // A. Handle ATM Withdrawals
        if (isWithdrawal) {
            const atmLocMatch = fullText.match(/(?:cajero|atm|ubicaci[oó]n)\s*:\s*([^\n\r<]{3,60})/i);
            if (atmLocMatch && atmLocMatch[1]) {
                merchant = `Retiro en Cajero (${this.cleanMerchantName(atmLocMatch[1])})`;
            }
            else {
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
            }
            else if (isPayday || /n[oó]mina|sueldo/i.test(fullText)) {
                merchant = dayOfMonth <= 16
                    ? 'Nómina Quincenal (Día 15) - Promerica'
                    : 'Nómina Quincenal (Día 30) - Promerica';
            }
            else {
                merchant = 'Depósito / Transferencia Recibida';
            }
        }
        // C. Bank service fees (e.g. SMS notification charge)
        else if (/notificaci[oó]n(?:es)?\s*(?:por\s*)?sms|cargo\s+por\s+servicio\s+de\s+notificaci[oó]n/i.test(fullText)) {
            merchant = 'Cargo por Notificación SMS';
        }
        // D. Standard Merchant Extraction for Purchases
        else {
            const lineMatches = fullText.match(/(?:comercio|establecimiento|lugar|negocio|proveedor|afiliado)\s*:\s*([^\n\r<]{3,80})/i);
            if (lineMatches && lineMatches[1]) {
                merchant = this.cleanMerchantName(lineMatches[1]);
            }
            if (!merchant) {
                const inlineMatch = fullText.match(/(?:consumo en|compra en|realizada en|cargo en|pago a)\s+([^,\n\r<]{3,60}?)(?:\s+por|\s+con|\s+el|\s+en\s+fecha|\.|\,|$)/i);
                if (inlineMatch && inlineMatch[1]) {
                    merchant = this.cleanMerchantName(inlineMatch[1]);
                }
            }
            // If no valid merchant or transaction context was found, do NOT create a phantom transaction
            if (!merchant || merchant.length < 2) {
                merchant = this.extractMerchantAfterAmount(fullText);
            }
            if (!merchant || merchant.length < 2) {
                return null;
            }
        }
        // Extract card reference
        let accountReference = undefined;
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
exports.PromericaParser = PromericaParser;
