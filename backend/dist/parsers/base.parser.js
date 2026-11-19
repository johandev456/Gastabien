"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBankParser = void 0;
const date_1 = require("../utils/date");
class BaseBankParser {
    /**
     * Cleans and normalizes email body.
     * Converts HTML block and table elements into newlines to preserve field boundaries!
     */
    cleanText(content) {
        if (!content)
            return '';
        return content
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
            // Convert block tags and table cells to newlines
            .replace(/<\/(td|tr|table|div|p|h[1-6]|li|ul|ol|header|footer)>/gi, '\n')
            .replace(/<(br|hr)\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            // Normalize multiple horizontal spaces, but keep newlines
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s+/g, '\n')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }
    /**
     * Extracts currency and numeric amount with strict boundaries.
     * Prevents matching card numbers, approval codes, or phone numbers as amounts.
     */
    parseAmountAndCurrency(text) {
        if (!text)
            return null;
        // Detect currency
        let currency = 'DOP';
        if (/US\$|USD|Dólares|Dolares/i.test(text)) {
            currency = 'USD';
        }
        // Match only well-formed amounts: grouped thousands with optional decimals
        // (12,500 / 1,234,567.89 / 1.500,00) or plain numbers (35 / 12.99 / 146,44).
        // Plain numbers are capped at 7 digits so card/approval codes are never read as amounts.
        const amountMatch = text.match(/(?:RD\$|USD|US\$|\$|DOP)?\s*([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?(?![0-9])|[0-9]{1,7}(?:[.,][0-9]{1,2})?(?![0-9]))/i);
        if (!amountMatch)
            return null;
        const rawNum = BaseBankParser.normalizeNumber(amountMatch[1].trim());
        if (rawNum === null)
            return null;
        const amount = Math.round(parseFloat(rawNum) * 100) / 100;
        // Sanity check: Amount must be positive and reasonable (e.g. < 5,000,000 DOP)
        if (isNaN(amount) || amount <= 0 || amount > 5000000)
            return null;
        return { amount, currency };
    }
    /**
     * Normalizes a localized number string to a JS-parsable one.
     * The LAST separator followed by 1-2 digits is the decimal mark; every other separator is grouping.
     */
    static normalizeNumber(raw) {
        const cleaned = raw.replace(/\s/g, '');
        if (!/^[0-9][0-9.,]*$/.test(cleaned))
            return null;
        const lastSep = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
        if (lastSep === -1)
            return cleaned;
        const decimals = cleaned.length - lastSep - 1;
        if (decimals >= 1 && decimals <= 2) {
            return cleaned.slice(0, lastSep).replace(/[.,]/g, '') + '.' + cleaned.slice(lastSep + 1);
        }
        return cleaned.replace(/[.,]/g, '');
    }
    /** Finds the first amount preceded by a currency marker anywhere in the text. */
    findCurrencyAmount(text) {
        const matches = text.match(/(?:RD\$|US\$|USD|DOP)\s*(?:[0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/gi);
        if (!matches)
            return null;
        for (const matchStr of matches) {
            const parsed = this.parseAmountAndCurrency(matchStr);
            if (parsed && parsed.amount > 0)
                return parsed;
        }
        return null;
    }
    /**
     * Fallback merchant extraction for sentences like
     * "consumo aprobado por RD$ 5,890.75 en SUPERMERCADOS NACIONAL con su tarjeta ..." or
     * "pago ... por RD$ 3,200.00 a favor de CLARO DOMINICANA".
     */
    extractMerchantAfterAmount(text) {
        const m = text.match(/(?:RD\$|US\$|USD|DOP)\s*[0-9][0-9.,]*\s+(?:en(?:\s+el\s+comercio)?|a\s+favor\s+de)\s+([^,\n\r<]{2,60}?)(?=\s+con\b|\s+el\s|\s+por\b|\s+en\s+fecha|\.(?:\s|$)|,|$)/i);
        if (!m || !m[1])
            return '';
        const candidate = this.cleanMerchantName(m[1]);
        if (/^(?:su|tu)\s+(?:cuenta|tarjeta)/i.test(candidate))
            return '';
        return candidate;
    }
    /** Removes card-product names so "Tarjeta de Crédito" is not mistaken for an income credit. */
    stripCardProductNames(text) {
        return (text || '').replace(/tarjetas?\s+(?:de\s+)?cr[eé]dito/gi, 'tarjeta');
    }
    /**
     * Cleans merchant name by removing trailing Dominican city/country noise,
     * trailing field labels, and multiple spaces.
     */
    cleanMerchantName(merchant) {
        if (!merchant)
            return '';
        let cleaned = merchant
            .replace(/^(?:en\s+|el\s+comercio\s+|el\s+negocio\s+|a\s+favor\s+de\s+|en\s+el\s+establecimiento\s+)/i, '')
            // Remove trailing field labels that might have been glued
            .replace(/\s*(?:Fecha|Hora|Monto|Tarjeta|Aprobaci[oó]n|Autorizaci[oó]n|Referencia|Balance|Estado|Canal|Moneda|Pais|Pa[ií]s)\s*(?::|y\s*hora)?.*$/i, '')
            // Remove trailing Dominican city / DO country noise
            .replace(/\s*(?:SANTO\s*DOMINGO\s*DO|SANTO\s*DOMINGODO|SANTO\s*DOMINGO|S\s*DG|SD|DO|RD|DOMINICANA|REPUBLICA\s*DOMINICANA)\s*$/i, '')
            .replace(/[,\.\*\-_:\/]+$/, '')
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned;
    }
    /**
     * Standardizes dates to ISO string
     */
    parseDate(text, fallbackDate) {
        const fallback = isNaN(fallbackDate.getTime()) ? new Date() : fallbackDate;
        if (!text)
            return fallback.toISOString();
        try {
            // Look for DD/MM/YYYY or DD-MM-YYYY with optional HH:mm:ss AM/PM.
            // Times written in bank emails are Dominican local time (UTC-4).
            const dmyMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|a\.\s?m\.|p\.\s?m\.)?)?/i);
            if (dmyMatch) {
                const day = parseInt(dmyMatch[1], 10);
                const month = parseInt(dmyMatch[2], 10);
                const year = parseInt(dmyMatch[3], 10);
                if ((0, date_1.isValidYmd)(year, month, day)) {
                    // Without an explicit time, use the email's own time expressed in DR local time
                    const fallbackDr = new Date(fallback.getTime() + date_1.DR_OFFSET_HOURS * 3600 * 1000);
                    let hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : fallbackDr.getUTCHours();
                    const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : fallbackDr.getUTCMinutes();
                    const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
                    const ampm = (dmyMatch[7] || '').toLowerCase().replace(/[\s.]/g, '');
                    if (ampm === 'pm' && hours < 12)
                        hours += 12;
                    if (ampm === 'am' && hours === 12)
                        hours = 0;
                    if (hours <= 23 && minutes <= 59 && seconds <= 59) {
                        const parsed = (0, date_1.drWallClockToDate)(year, month, day, hours, minutes, seconds);
                        if (!isNaN(parsed.getTime())) {
                            return parsed.toISOString();
                        }
                    }
                }
            }
        }
        catch {
            // fallback
        }
        return fallback.toISOString();
    }
}
exports.BaseBankParser = BaseBankParser;
