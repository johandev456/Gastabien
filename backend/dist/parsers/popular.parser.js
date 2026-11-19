"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopularParser = void 0;
const base_parser_1 = require("./base.parser");
const date_1 = require("../utils/date");
class PopularParser extends base_parser_1.BaseBankParser {
    bankCode = 'POPULAR';
    bankName = 'Banco Popular Dominicano';
    canParse(email) {
        const from = (email.from || '').toLowerCase();
        const subject = (email.subject || '').toLowerCase();
        const body = (email.bodySnippet || '').toLowerCase();
        // Generic "Aviso de ..." subjects are shared by several banks: only trust them
        // when the sender is not another supported bank.
        const fromOtherBank = /bhd\.com\.do|bhdleon\.com\.do|promerica\.com\.do|qik\.com\.do/.test(from);
        return (from.includes('bpd.com.do') ||
            from.includes('popularenlinea') ||
            subject.includes('banco popular') ||
            body.includes('banco popular dominicano') ||
            (!fromOtherBank && (subject.includes('aviso de débito') || subject.includes('aviso de debito') || subject.includes('aviso de compra') || subject.includes('aviso de retiro'))));
    }
    parse(email) {
        const fullText = this.cleanText((email.bodyHtml || '') + '\n' + (email.bodyText || '') + '\n' + (email.bodySnippet || ''));
        const subject = email.subject || '';
        const typeSubject = this.stripCardProductNames(subject);
        const typeText = this.stripCardProductNames(fullText);
        // Determine Transaction Type (purchases/consumptions always win over generic "crédito")
        let type = 'EXPENSE';
        const isPurchase = /consumo|compra|d[eé]bito por|cargo/i.test(typeSubject);
        const isIncome = !isPurchase && (/dep[oó]sito|cr[eé]dito|transferencia recibida|abono a cuenta|n[oó]mina|nomina|sueldo|salario/i.test(typeSubject) ||
            /dep[oó]sito recibido|cr[eé]dito aplicado|abono de n[oó]mina|sueldo acreditado|cr[eé]dito por n[oó]mina/i.test(typeText));
        const isWithdrawal = (/retiro\s*en\s*cajero|retiro\s*de\s*efectivo|cajero\s*autom[aá]tico|retiro\s*atm/i.test(subject) ||
            /retiro\s*en\s*cajero|retiro\s*de\s*efectivo|cajero\s*autom[aá]tico|cajero\s*automatico|retiro\s*atm/i.test(fullText));
        if (isIncome) {
            type = 'INCOME';
        }
        else if (/transferencia entre cuentas|pago de tarjeta/i.test(subject)) {
            type = 'TRANSFER';
        }
        // Extract Amount & Currency
        let amount = 0;
        let currency = 'DOP';
        // 1. Look for labeled field: "Monto: RD$ XXX" or "Importe: RD$ XXX"
        const labeledMatch = fullText.match(/(?:monto|importe|valor|por un monto de|consumo por|retiro por|dep[oó]sito por)\s*:\s*(?:RD\$|USD|US\$|\$|DOP)?\s*([0-9,.]+)/i);
        if (labeledMatch) {
            const parsed = this.parseAmountAndCurrency(labeledMatch[0]);
            if (parsed) {
                amount = parsed.amount;
                currency = parsed.currency;
            }
        }
        // 2. Fallback: Currency marker with amount
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
        if (isWithdrawal) {
            const atmLocMatch = fullText.match(/(?:cajero|atm|ubicaci[oó]n|en)\s*:\s*([^\n\r<]{3,60})/i);
            if (atmLocMatch && atmLocMatch[1]) {
                merchant = `Retiro en Cajero (${this.cleanMerchantName(atmLocMatch[1])})`;
            }
            else {
                merchant = 'Retiro en Cajero Popular (ATM)';
            }
        }
        else if (isIncome) {
            const isPayday = (dayOfMonth >= 14 && dayOfMonth <= 16) || (dayOfMonth >= 28 && dayOfMonth <= 31) || dayOfMonth === 1;
            const originMatch = fullText.match(/(?:de|origen|ordenante|remitente|empresa)\s*:\s*([^\n\r<]{3,60})/i);
            if (originMatch && originMatch[1]) {
                merchant = `Ingreso de Nómina - ${this.cleanMerchantName(originMatch[1])}`;
            }
            else if (isPayday || /n[oó]mina|sueldo/i.test(fullText)) {
                merchant = dayOfMonth <= 16 ? 'Nómina Quincenal (Día 15) - Popular' : 'Nómina Quincenal (Día 30) - Popular';
            }
            else {
                merchant = 'Depósito en Cuenta Popular';
            }
        }
        else {
            const labeledMerchant = fullText.match(/(?:establecimiento|comercio|lugar|beneficiario|negocio)\s*:\s*([^\n\r<]{3,80})/i);
            if (labeledMerchant && labeledMerchant[1]) {
                merchant = this.cleanMerchantName(labeledMerchant[1]);
            }
            if (!merchant) {
                const inlineMatch = fullText.match(/(?:realizada en|compra en|consumo en|transferencia a favor de)\s+([^,\n\r<]{3,60}?)(?:\s+el|\s+por|\s+con|\s+en\s+fecha|\.|\,|$)/i);
                if (inlineMatch && inlineMatch[1]) {
                    merchant = this.cleanMerchantName(inlineMatch[1]);
                }
            }
            if (!merchant || merchant.length < 2) {
                merchant = this.extractMerchantAfterAmount(fullText);
            }
            if (!merchant || merchant.length < 2) {
                return null;
            }
        }
        // Extract Account/Card reference
        let accountReference = undefined;
        const cardMatch = fullText.match(/(?:tarjeta|cuenta|cta)\s*(?:terminada en|no\.|n[uú]mero|num|\*+)?\s*[:\*\.\s]*([0-9X\*]{4,16})/i);
        if (cardMatch && cardMatch[1]) {
            const lastDigits = cardMatch[1].replace(/[^0-9]/g, '').slice(-4);
            if (lastDigits) {
                accountReference = `Popular ...${lastDigits}`;
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
exports.PopularParser = PopularParser;
