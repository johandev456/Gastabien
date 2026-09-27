"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statementService = exports.StatementService = void 0;
const db_1 = require("../database/db");
const categorization_service_1 = require("./categorization.service");
class StatementService {
    /**
     * Helper to parse a CSV line accounting for quotes
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result.map(c => c.replace(/^"|"$/g, '').trim());
    }
    /**
     * Cleans and beautifies raw bank descriptions (especially Promerica POS, ATM, DGII, Paydays)
     */
    cleanPromericaDescription(raw, txCode, type = 'EXPENSE') {
        let text = raw.trim();
        // 1. Remove pipe tails e.g. "||" or trailing delimiters
        text = text.replace(/\|+$/g, '').trim();
        // 2. Clean Paydays & Incomes
        if (type === 'INCOME' || txCode === '58-27' || /quincena|n[oó]mina|sueldo|salario|abono|dep[oó]sito/i.test(text)) {
            if (/primera\s+quincena/i.test(text)) {
                const monthMatch = text.match(/quincena\s+de\s+([A-Za-z]+)(?:\s+(\d{4}))?/i);
                const month = monthMatch ? monthMatch[1] : '';
                const year = monthMatch && monthMatch[2] ? ` ${monthMatch[2]}` : '';
                return `Nómina - 1ra Quincena de ${this.capitalize(month)}${year}`;
            }
            if (/segunda\s+quincena/i.test(text)) {
                const monthMatch = text.match(/quincena\s+de\s+([A-Za-z]+)(?:\s+(\d{4}))?/i);
                const month = monthMatch ? monthMatch[1] : '';
                const year = monthMatch && monthMatch[2] ? ` ${monthMatch[2]}` : '';
                return `Nómina - 2da Quincena de ${this.capitalize(month)}${year}`;
            }
            if (/abono\s+de\s+n[oó]mina|pago\s+de\s+n[oó]mina/i.test(text)) {
                const clean = text.replace(/^(?:abono|pago)\s+de\s+n[oó]mina\s*[:\-]?\s*/i, '').trim();
                return clean ? `Ingreso de Nómina - ${clean}` : 'Ingreso de Nómina';
            }
            if (/transferencia\s+recibida/i.test(text)) {
                const clean = text.replace(/^transferencia\s+recibida\s*(?:de)?\s*[:\-]?\s*/i, '').trim();
                return clean ? `Transferencia Recibida - ${clean}` : 'Transferencia Recibida';
            }
            return text;
        }
        // 3. Clean ATM Withdrawals
        if (txCode === '57-81' || /retiro\s*atm|cajero|dispensaci[oó]n/i.test(text)) {
            let atmLoc = text
                .replace(/^RETIRO\s*ATM\s*/i, '')
                .replace(/\s*(?:SANTO\s*DOMINGO\s*DO|SANTO\s*DOMINGO\s*DR\s*DO|REPSTDOM\s*DR\s*DO|SANTO\s*DOMINGO|DR\s*DO|DO)$/i, '')
                .replace(/\b010REPSTDOM\b/i, '')
                .replace(/\s+/g, ' ')
                .trim();
            if (/reservas/i.test(atmLoc)) {
                atmLoc = 'ATM Banreservas';
            }
            else if (/bhd/i.test(atmLoc)) {
                atmLoc = 'ATM Banco BHD';
            }
            else if (/popular/i.test(atmLoc)) {
                atmLoc = 'ATM Banco Popular';
            }
            else if (/promerica/i.test(atmLoc)) {
                atmLoc = 'ATM Banco Promerica';
            }
            return `Retiro en Cajero (${atmLoc})`;
        }
        // 4. Clean DGII Tax
        if (txCode === '79-49' || /cobro\s*impuesto\s*cheques/i.test(text)) {
            return 'Impuesto 0.15% Transferencias (DGII)';
        }
        // 5. Clean Codetel / Claro phone bill payments
        if (/pago\s*codetel_prepago|pago\s*claro/i.test(text)) {
            const phoneMatch = text.match(/(?:prepago|pago)\s*(\d{10})/i);
            if (phoneMatch && phoneMatch[1]) {
                const p = phoneMatch[1];
                const formatted = `${p.substring(0, 3)}-${p.substring(3, 6)}-${p.substring(6)}`;
                return `Pago Claro Prepago (${formatted})`;
            }
            return 'Pago Factura Claro / Codetel';
        }
        // 6. Clean POS purchases
        let merchant = text
            .replace(/^COMPRA\s+POS\s+/i, '')
            .replace(/\s*(?:SANTO\s*DOMINGODO|SANTO\s*DOMINGO\s*DO|SANTO\s*DOMINGO|SANTO\s*DOM\s*DO|DR\s*DO|AMZN\.COM\/BILLUS|US)$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
        // Specific merchant beautifications
        if (/sm\s*bravo/i.test(merchant)) {
            const branch = merchant.replace(/^sm\s*bravo\s*/i, '').trim();
            return branch ? `Supermercados Bravo (${this.titleCase(branch)})` : 'Supermercados Bravo';
        }
        if (/totalenergies|total\s*27\s*de\s*feb/i.test(merchant)) {
            const branch = merchant.replace(/^totalenergies\s*|^total\s*/i, '').trim();
            return branch ? `TotalEnergies (${this.titleCase(branch)})` : 'Estación TotalEnergies';
        }
        if (/sm\s*nacional/i.test(merchant)) {
            const branch = merchant.replace(/^sm\s*nacional\s*/i, '').trim();
            return branch ? `Supermercados Nacional (${this.titleCase(branch)})` : 'Supermercados Nacional';
        }
        if (/la\s*sirena/i.test(merchant)) {
            const branch = merchant.replace(/^la\s*sirena\s*/i, '').trim();
            return branch ? `La Sirena (${this.titleCase(branch)})` : 'Hipermercados La Sirena';
        }
        if (/amazon\s*mktplace/i.test(merchant)) {
            return 'Amazon Marketplace';
        }
        if (/coffee\s*shop\s*pucmm/i.test(merchant)) {
            return 'Coffee Shop PUCMM';
        }
        if (/the\s*irish\s*pub/i.test(merchant)) {
            return 'The Irish Pub';
        }
        if (/xupitos/i.test(merchant)) {
            return 'Xupitos Bar';
        }
        if (/expendomax/i.test(merchant)) {
            return 'Expendomax (Máquinas Expendedoras)';
        }
        return this.titleCase(merchant);
    }
    capitalize(s) {
        if (!s)
            return '';
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }
    titleCase(s) {
        if (!s)
            return '';
        const smallWords = new Set(['de', 'la', 'el', 'los', 'las', 'en', 'y', 'del', 'rd', 'pos', 'pmts']);
        return s.toLowerCase().split(' ').map((word, idx) => {
            if (idx > 0 && smallWords.has(word))
                return word;
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    }
    /**
     * Parses raw statement text / CSV / copied internet banking tables
     */
    parseStatementText(text, defaultBank = 'PROMERICA') {
        const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const entries = [];
        // Check if this is a structured CSV with headers
        let headerColIdx = null;
        for (let i = 0; i < rawLines.length; i++) {
            const line = rawLines[i];
            const lower = line.toLowerCase();
            // Check header row
            if ((lower.includes('fecha de posteo') || lower.includes('fecha')) && (lower.includes('retiros') || lower.includes('depósitos') || lower.includes('depositos') || lower.includes('débito') || lower.includes('debito'))) {
                const cols = this.parseCSVLine(line);
                headerColIdx = {};
                cols.forEach((col, idx) => {
                    const c = col.toLowerCase().trim();
                    if (c.includes('fecha de posteo') || (c === 'fecha' && headerColIdx?.postDate === undefined))
                        headerColIdx.postDate = idx;
                    if (c.includes('código') || c.includes('codigo'))
                        headerColIdx.txCode = idx;
                    if (c.includes('referencia') || c.includes('no. referencia'))
                        headerColIdx.ref = idx;
                    if (c.includes('descripci') || c.includes('concepto') || c.includes('detalle'))
                        headerColIdx.desc = idx;
                    if (c.includes('retiro') || c.includes('d[eé]bito') || c.includes('debito') || c.includes('cargos'))
                        headerColIdx.withdrawals = idx;
                    if (c.includes('dep[oó]sito') || c.includes('deposito') || c.includes('cr[eé]dito') || c.includes('credito') || c.includes('abonos'))
                        headerColIdx.deposits = idx;
                    if (c.includes('balance') || c.includes('saldo'))
                        headerColIdx.balance = idx;
                });
                continue;
            }
            // If we found a structured header, parse row with header columns
            if (headerColIdx && headerColIdx.postDate !== undefined) {
                const cols = this.parseCSVLine(line);
                if (cols.length <= 3)
                    continue; // Skip blank or summary rows like "Totales:"
                const rawDate = cols[headerColIdx.postDate] || '';
                if (!/\d{1,2}[\/\-\.]\d{1,2}/.test(rawDate))
                    continue;
                const dateMatch = rawDate.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
                if (!dateMatch)
                    continue;
                const day = parseInt(dateMatch[1], 10);
                const month = parseInt(dateMatch[2], 10);
                let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
                if (year < 100)
                    year += 2000;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const rawDesc = headerColIdx.desc !== undefined ? cols[headerColIdx.desc] : (cols[5] || '');
                if (/^\s*totales?\s*:?\s*$/i.test(rawDesc) || (cols[0] === '' && /totales?/i.test(rawDesc)))
                    continue;
                const txCode = headerColIdx.txCode !== undefined ? cols[headerColIdx.txCode] : (cols[3] || '');
                const ref = headerColIdx.ref !== undefined ? cols[headerColIdx.ref] : (cols[4] || '');
                const withdrawalStr = headerColIdx.withdrawals !== undefined ? cols[headerColIdx.withdrawals] : (cols[6] || '0');
                const depositStr = headerColIdx.deposits !== undefined ? cols[headerColIdx.deposits] : (cols[7] || '0');
                const withdrawal = parseFloat(withdrawalStr.replace(/,/g, '')) || 0;
                const deposit = parseFloat(depositStr.replace(/,/g, '')) || 0;
                let type = 'EXPENSE';
                let amount = 0;
                if (deposit > 0) {
                    type = 'INCOME';
                    amount = deposit;
                }
                else if (withdrawal > 0) {
                    type = 'EXPENSE';
                    amount = withdrawal;
                }
                else {
                    continue; // 0 amount row
                }
                const cleanDesc = this.cleanPromericaDescription(rawDesc, txCode, type);
                entries.push({
                    date: dateStr,
                    rawDate,
                    description: cleanDesc,
                    amount: Math.round(amount * 100) / 100,
                    currency: 'DOP',
                    type,
                    reference: ref || undefined,
                    txCode: txCode || undefined
                });
                continue;
            }
            // Fallback: Line-by-line regex parsing for unstructured/copy-pasted text
            // Skip header rows
            if (/fecha|date|descripci[oó]n|concepto|balance|d[eé]bito|cr[eé]dito|monto|mismo/i.test(line) && !/\d{2}[\/\-\.]\d{2}/.test(line)) {
                continue;
            }
            const dateMatch = line.match(/(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
            if (!dateMatch)
                continue;
            const day = parseInt(dateMatch[1], 10);
            const month = parseInt(dateMatch[2], 10);
            let year = dateMatch[3] ? parseInt(dateMatch[3], 10) : new Date().getFullYear();
            if (year < 100)
                year += 2000;
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            // Extract all currency amounts
            const numbers = Array.from(line.matchAll(/(?:RD\$|USD|US\$|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/g));
            if (numbers.length === 0)
                continue;
            // Filter out 0.00 if there is another positive number on the line (e.g. 0.00 and 13325.80)
            const validNumbers = numbers
                .map(n => parseFloat(n[1].replace(/,/g, '')))
                .filter(n => !isNaN(n) && n > 0);
            if (validNumbers.length === 0)
                continue;
            const amount = validNumbers[0];
            const currency = /US\$|USD/i.test(line) ? 'USD' : 'DOP';
            // Clean description
            let desc = line
                .replace(dateMatch[0], '')
                .replace(/(?:[\+\-])?\s*(?:RD\$|USD|US\$|\$)?\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})/g, '')
                .replace(/[,\t|;]+/g, ' ')
                .replace(/[\+\-:]+$/g, '')
                .replace(/^[\+\-:]+/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            const isIncome = (/\+|cr[eé]dito|dep[oó]sito|deposito|abono|n[oó]mina|nomina|sueldo|salario|honorarios|quincena|transferencia recibida|transf\.?\s*recibida|ach\s*recibido|lbtr\s*recibido|intereses\s*ganados|cashback|devoluci[oó]n|reembolso|acreditaci[oó]n|acreditad[oa]|\bcr\b|\bdep\b/i.test(line) ||
                /\+|abono|n[oó]mina|nomina|quincena|dep[oó]sito|deposito|sueldo|salario|acreditad/i.test(desc));
            const type = isIncome ? 'INCOME' : 'EXPENSE';
            const cleanDesc = this.cleanPromericaDescription(desc, undefined, type);
            entries.push({
                date: dateStr,
                rawDate: dateMatch[0],
                description: cleanDesc,
                amount: Math.round(amount * 100) / 100,
                currency,
                type
            });
        }
        return entries;
    }
    /**
     * Reconciles parsed statement entries against database transactions
     */
    reconcile(userId, statementText, bankCode = 'PROMERICA', autoImport = true) {
        const entries = this.parseStatementText(statementText, bankCode);
        const existingTransactions = db_1.dbOps.getTransactions(userId, { bank: bankCode });
        const report = {
            totalStatementEntries: entries.length,
            matchedCount: 0,
            addedCount: 0,
            updatedCount: 0,
            removedCount: 0,
            totalIncomeAmount: 0,
            totalExpenseAmount: 0,
            items: []
        };
        const usedTxIds = new Set();
        // 1st Pass: Match or Add Statement Entries (Statement is the Absolute Truth)
        for (const entry of entries) {
            if (entry.type === 'INCOME') {
                report.totalIncomeAmount += entry.amount;
            }
            else {
                report.totalExpenseAmount += entry.amount;
            }
            // Find matching existing transaction (same date +/- 2 days and same amount)
            const match = existingTransactions.find(tx => {
                if (usedTxIds.has(tx.id))
                    return false;
                const isSameAmount = Math.abs(tx.amount - entry.amount) < 0.05;
                if (!isSameAmount)
                    return false;
                // Date proximity check
                const txDate = tx.date.substring(0, 10);
                const diffDays = Math.abs(new Date(txDate).getTime() - new Date(entry.date).getTime()) / (1000 * 3600 * 24);
                return diffDays <= 3;
            });
            if (match) {
                usedTxIds.add(match.id);
                report.matchedCount++;
                // If existing transaction had a generic or unpolished name, upgrade with official statement description!
                let updated = false;
                if (match.merchant.startsWith('Transacción') || match.merchant.startsWith('Consumo Tarjeta') || match.merchant !== entry.description) {
                    const cleanDesc = entry.description.replace(/^Retiro en Cajero \(/, '').replace(/\)$/, '');
                    const newCategory = categorization_service_1.categorizationService.categorize(cleanDesc, undefined, entry.type);
                    db_1.dbOps.updateTransaction(userId, match.id, {
                        merchant: entry.description,
                        category: newCategory
                    });
                    report.updatedCount++;
                    updated = true;
                }
                report.items.push({
                    entry,
                    status: updated ? 'UPDATED' : 'MATCHED',
                    matchedTransactionId: match.id,
                    details: updated
                        ? `Nombre y categoría actualizados desde el estado de cuenta oficial.`
                        : `Verificado: coincide con registro de correo existente.`
                });
            }
            else {
                // Missing transaction (present in statement but wasn't in email notifications, e.g. Nómina, ATM)
                if (autoImport) {
                    const category = categorization_service_1.categorizationService.categorize(entry.description, undefined, entry.type);
                    const newTx = db_1.dbOps.createTransaction({
                        userId,
                        bank: bankCode,
                        bankName: bankCode === 'PROMERICA' ? 'Banco Promerica' : bankCode,
                        type: entry.type,
                        amount: entry.amount,
                        currency: entry.currency,
                        merchant: entry.description,
                        date: new Date(entry.date).toISOString(),
                        category,
                        notes: entry.reference ? `Ref: ${entry.reference} (Estado de Cuenta)` : 'Importado desde Estado de Cuenta',
                        isManual: false
                    });
                    report.addedCount++;
                    report.items.push({
                        entry,
                        status: 'ADDED',
                        matchedTransactionId: newTx.id,
                        details: entry.type === 'INCOME'
                            ? `Ingreso oficial detectado e importado al balance.`
                            : `Movimiento oficial agregado desde estado de cuenta.`
                    });
                }
            }
        }
        // 2nd Pass: Remove unverified email transactions within statement period
        // Determine the statement date range
        let minDateStr = '';
        let maxDateStr = '';
        const desdeMatch = statementText.match(/fecha\s*desde\s*:?,?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
        const hastaMatch = statementText.match(/fecha\s*hasta\s*:?,?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
        if (desdeMatch) {
            const parts = desdeMatch[1].split(/[\/\-\.]/);
            let y = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
            if (y < 100)
                y += 2000;
            minDateStr = `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (hastaMatch) {
            const parts = hastaMatch[1].split(/[\/\-\.]/);
            let y = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
            if (y < 100)
                y += 2000;
            maxDateStr = `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (!minDateStr || !maxDateStr) {
            const sortedDates = entries.map(e => e.date).sort();
            if (sortedDates.length > 0) {
                minDateStr = sortedDates[0];
                maxDateStr = sortedDates[sortedDates.length - 1];
            }
        }
        if (minDateStr && maxDateStr) {
            db_1.dbOps.saveReconciledPeriod(userId, bankCode, minDateStr, maxDateStr);
            const minTime = new Date(`${minDateStr}T00:00:00.000Z`).getTime() - (24 * 3600 * 1000);
            const maxTime = new Date(`${maxDateStr}T23:59:59.999Z`).getTime() + (24 * 3600 * 1000);
            for (const tx of existingTransactions) {
                // If this transaction was matched, keep it
                if (usedTxIds.has(tx.id))
                    continue;
                const txTime = new Date(tx.date).getTime();
                // If it falls within the statement date window but was NOT in the statement, it's a ghost/declined/canceled email transaction!
                if (txTime >= minTime && txTime <= maxTime) {
                    if (tx.externalId) {
                        db_1.dbOps.ignoreExternalId(userId, tx.externalId);
                    }
                    db_1.dbOps.deleteTransaction(userId, tx.id);
                    report.removedCount++;
                    report.items.push({
                        entry: {
                            date: tx.date.substring(0, 10),
                            rawDate: tx.date.substring(0, 10),
                            description: tx.merchant,
                            amount: tx.amount,
                            currency: tx.currency,
                            type: tx.type
                        },
                        status: 'REMOVED',
                        matchedTransactionId: tx.id,
                        details: 'Descartado: se leyó de un correo pero NO figura en el estado de cuenta oficial (cargo declinado, cancelado o duplicado).'
                    });
                }
            }
        }
        report.totalIncomeAmount = Math.round(report.totalIncomeAmount * 100) / 100;
        report.totalExpenseAmount = Math.round(report.totalExpenseAmount * 100) / 100;
        return report;
    }
}
exports.StatementService = StatementService;
exports.statementService = new StatementService();
