"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QikParser = void 0;
const base_parser_1 = require("./base.parser");
class QikParser extends base_parser_1.BaseBankParser {
    bankCode = 'QIK';
    bankName = 'Qik Banco Digital';
    canParse(email) {
        const from = (email.from || '').toLowerCase();
        const subject = (email.subject || '').toLowerCase();
        const body = (email.bodySnippet || '').toLowerCase();
        return (from.includes('qik.com.do') ||
            subject.includes('qik') ||
            body.includes('qik banco digital') ||
            body.includes('qik tarjeta'));
    }
    parse(email) {
        const fullText = this.cleanText((email.bodyHtml || '') + '\n' + (email.bodyText || '') + '\n' + (email.bodySnippet || ''));
        const subject = email.subject || '';
        // Determine type
        let type = 'EXPENSE';
        if (/transferencia recibida|cashback|depósito|deposito|abono/i.test(subject) || /recibiste una transferencia|cashback acreditado/i.test(fullText)) {
            type = 'INCOME';
        }
        else if (/pago de tarjeta|transferencia enviada/i.test(subject)) {
            type = 'TRANSFER';
        }
        // Extract amount
        let amount = 0;
        let currency = 'DOP';
        // 1. Labeled field: "Monto: RD$ XXX" or "Valor: RD$ XXX"
        const labeledMatch = fullText.match(/(?:monto|valor|has gastado|consumo de|por la suma de)\s*:\s*(?:RD\$|USD|US\$|\$|DOP)?\s*([0-9,.]+)/i);
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
        if (amount <= 0)
            return null;
        // Extract merchant
        let merchant = '';
        if (/cashback/i.test(subject) || /cashback acreditado/i.test(fullText)) {
            merchant = 'Cashback Qik';
        }
        if (!merchant) {
            const labeledMerchant = fullText.match(/(?:comercio|establecimiento|negocio|en el comercio|beneficiario)\s*:\s*([^\n\r<]{3,80})/i);
            if (labeledMerchant && labeledMerchant[1]) {
                merchant = this.cleanMerchantName(labeledMerchant[1]);
            }
        }
        if (!merchant) {
            const inlineMatch = fullText.match(/(?:compra en|pago en|transferencia a|consumo en|en el comercio|en)\s+([^,\n\r<]{3,60}?)(?:\s+por|\s+con|\s+el|\s+en\s+fecha|\.|\,|$)/i);
            if (inlineMatch && inlineMatch[1]) {
                const candidate = this.cleanMerchantName(inlineMatch[1]);
                if (candidate.toLowerCase() !== 'qik' && candidate.toLowerCase() !== 'tu cuenta') {
                    merchant = candidate;
                }
            }
        }
        if (!merchant || merchant.length < 2) {
            if (type === 'INCOME') {
                merchant = 'Transferencia Recibida Qik';
            }
            else {
                merchant = 'Transacción Qik Digital';
            }
        }
        // Account or Card reference
        let accountReference = undefined;
        const cardMatch = fullText.match(/(?:tarjeta|qik|cuenta|cta)\s*(?:terminada en|no\.|n[uú]mero|\*+)?\s*[:\*\.\s]*([0-9X\*]{4,16})/i);
        if (cardMatch && cardMatch[1]) {
            const digits = cardMatch[1].replace(/[^0-9]/g, '').slice(-4);
            if (digits) {
                accountReference = `Qik ...${digits}`;
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
exports.QikParser = QikParser;
