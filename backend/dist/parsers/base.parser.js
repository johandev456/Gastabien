"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBankParser = void 0;
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
        // Match only well-formed amounts (e.g. 1,540.50, 200.00, 35, 12.99)
        // Avoids massive multi-billion numbers from approval/card codes!
        const amountMatch = text.match(/(?:RD\$|USD|US\$|\$|DOP)?\s*([0-9]{1,3}(?:,[0-9]{3}){0,3}(?:\.[0-9]{1,2})|[0-9]{1,6}(?:\.[0-9]{1,2})?)/i);
        if (!amountMatch)
            return null;
        let rawNum = amountMatch[1].trim();
        // Normalize format
        if (rawNum.includes(',') && rawNum.includes('.')) {
            if (rawNum.lastIndexOf('.') > rawNum.lastIndexOf(',')) {
                rawNum = rawNum.replace(/,/g, '');
            }
            else {
                rawNum = rawNum.replace(/\./g, '').replace(',', '.');
            }
        }
        else if (rawNum.includes(',')) {
            const parts = rawNum.split(',');
            if (parts[1] && parts[1].length === 2) {
                rawNum = parts[0] + '.' + parts[1];
            }
            else {
                rawNum = rawNum.replace(/,/g, '');
            }
        }
        const amount = parseFloat(rawNum);
        // Sanity check: Amount must be positive and reasonable (e.g. < 5,000,000 DOP)
        if (isNaN(amount) || amount <= 0 || amount > 5000000)
            return null;
        return { amount, currency };
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
        if (!text)
            return fallbackDate.toISOString();
        try {
            // Look for DD/MM/YYYY or DD-MM-YYYY with optional HH:mm:ss AM/PM
            const dmyMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
            if (dmyMatch) {
                const day = parseInt(dmyMatch[1], 10);
                const month = parseInt(dmyMatch[2], 10) - 1;
                const year = parseInt(dmyMatch[3], 10);
                let hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : fallbackDate.getHours();
                const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : fallbackDate.getMinutes();
                const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
                const ampm = dmyMatch[7];
                if (ampm) {
                    if (ampm.toUpperCase() === 'PM' && hours < 12)
                        hours += 12;
                    if (ampm.toUpperCase() === 'AM' && hours === 12)
                        hours = 0;
                }
                const parsed = new Date(year, month, day, hours, minutes, seconds);
                if (!isNaN(parsed.getTime())) {
                    return parsed.toISOString();
                }
            }
        }
        catch {
            // fallback
        }
        return fallbackDate.toISOString();
    }
}
exports.BaseBankParser = BaseBankParser;
