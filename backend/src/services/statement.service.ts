import { dbOps } from '../database/db';
import { BankCode, Category, Transaction, TransactionType } from '../types';
import { categorizationService } from './categorization.service';

export interface StatementEntry {
  date: string;
  rawDate: string;
  description: string;
  amount: number;
  currency: 'DOP' | 'USD';
  type: TransactionType;
  reference?: string;
  txCode?: string;
  balance?: number;
}

export interface ReconciliationReport {
  totalStatementEntries: number;
  matchedCount: number;
  addedCount: number;
  updatedCount: number;
  removedCount: number;
  totalIncomeAmount: number;
  totalExpenseAmount: number;
  items: {
    entry: StatementEntry;
    status: 'MATCHED' | 'ADDED' | 'UPDATED' | 'REMOVED';
    matchedTransactionId?: string;
    details: string;
  }[];
}

function normalizeStr(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export class StatementService {
  /**
   * Helper to parse a CSV line accounting for quotes and delimiters (; or , or \t)
   */
  private parseCSVLine(line: string): string[] {
    // Detect delimiter: semicolon, tab, or comma
    const delimiter = line.includes(';') && !line.includes(',') ? ';' : (line.includes('\t') ? '\t' : ',');
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result.map(c => c.replace(/^["']+|["']+$/g, '').trim());
  }

  /**
   * Universal Date Parser for Dominican statements:
   * Handles: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD-MMM-YYYY, DD/MM/YY
   */
  public parseAnyDate(rawDate: string): string {
    if (!rawDate) return new Date().toISOString().substring(0, 10);
    const clean = rawDate.trim();

    // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10);
      const d = parseInt(isoMatch[3], 10);
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // 2. Month name in Spanish e.g. 25-SEP-2026 or 25/SEPTIEMBRE/2026
    const spanishMonths: Record<string, number> = {
      ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6,
      jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
      enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
      julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
    };

    const nameMonthMatch = clean.match(/^(\d{1,2})[\/\-\.\s]+([a-zA-ZáéíóúÁÉÍÓÚ]+)[\/\-\.\s]+(\d{2,4})/i);
    if (nameMonthMatch) {
      const d = parseInt(nameMonthMatch[1], 10);
      const monthKey = normalizeStr(nameMonthMatch[2]).substring(0, 3);
      const m = spanishMonths[monthKey] || 1;
      let y = parseInt(nameMonthMatch[3], 10);
      if (y < 100) y += 2000;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // 3. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})(?:[\/\-\.](\d{2,4}))?/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      let y = dmyMatch[3] ? parseInt(dmyMatch[3], 10) : new Date().getFullYear();
      if (y < 100) y += 2000;

      let day = p1;
      let month = p2;
      if (p1 <= 12 && p2 > 12) {
        day = p2;
        month = p1;
      }
      return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return new Date().toISOString().substring(0, 10);
  }

  /**
   * Cleans and beautifies raw bank descriptions (especially Promerica POS, ATM, DGII, Paydays)
   */
  public cleanPromericaDescription(raw: string, txCode?: string, type: TransactionType = 'EXPENSE'): string {
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
    if (/retiro\s*atm|cajero|dispensaci[oó]n|\batm\b/i.test(text) || (txCode === '57-81' && /retiro|cajero|atm/i.test(text))) {
      let atmLoc = text
        .replace(/^RETIRO\s*ATM\s*/i, '')
        .replace(/\s*(?:SANTO\s*DOMINGO\s*DO|SANTO\s*DOMINGO\s*DR\s*DO|REPSTDOM\s*DR\s*DO|SANTO\s*DOMINGO|DR\s*DO|DO)$/i, '')
        .replace(/\b010REPSTDOM\b/i, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (/reservas/i.test(atmLoc)) {
        atmLoc = 'ATM Banreservas';
      } else if (/bhd/i.test(atmLoc)) {
        atmLoc = 'ATM Banco BHD';
      } else if (/popular/i.test(atmLoc)) {
        atmLoc = 'ATM Banco Popular';
      } else if (/promerica/i.test(atmLoc)) {
        atmLoc = 'ATM Banco Promerica';
      }

      return `Retiro en Cajero (${atmLoc || 'ATM'})`;
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

  private capitalize(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  private titleCase(s: string): string {
    if (!s) return '';
    const smallWords = new Set(['de', 'la', 'el', 'los', 'las', 'en', 'y', 'del', 'rd', 'pos', 'pmts']);
    return s.toLowerCase().split(' ').map((word, idx) => {
      if (idx > 0 && smallWords.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  }

  /**
   * Robust parser for raw statement text, CSV, and copied online banking tables
   */
  public parseStatementText(text: string, defaultBank: BankCode = 'PROMERICA'): StatementEntry[] {
    const rawLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const entries: StatementEntry[] = [];

    // Header column indices
    let headerColIdx: {
      postDate?: number;
      txCode?: number;
      ref?: number;
      desc?: number;
      withdrawals?: number;
      deposits?: number;
      amount?: number;
      type?: number;
      balance?: number;
    } | null = null;

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const normLine = normalizeStr(line);

      // 1. Detect CSV Header Row
      const isHeaderRow = (
        (normLine.includes('fecha') || normLine.includes('posteo') || normLine.includes('date')) &&
        (normLine.includes('retiro') || normLine.includes('debito') || normLine.includes('deposito') || normLine.includes('credito') || normLine.includes('monto') || normLine.includes('balance') || normLine.includes('saldo') || normLine.includes('concepto') || normLine.includes('descripcion'))
      );

      if (isHeaderRow) {
        const cols = this.parseCSVLine(line);
        headerColIdx = {};

        cols.forEach((rawCol, idx) => {
          const c = normalizeStr(rawCol);

          if (c.includes('posteo') || (c.includes('fecha') && headerColIdx?.postDate === undefined)) {
            headerColIdx!.postDate = idx;
          } else if (c.includes('codigo') || c.includes('txcode')) {
            headerColIdx!.txCode = idx;
          } else if (c.includes('referencia') || c.includes('ref') || c.includes('secuencia') || c.includes('documento')) {
            headerColIdx!.ref = idx;
          } else if (c.includes('descripci') || c.includes('concepto') || c.includes('detalle') || c.includes('comercio') || c.includes('beneficiario') || c.includes('transaccion')) {
            headerColIdx!.desc = idx;
          } else if (c.includes('retiro') || c.includes('debito') || c.includes('cargo') || c.includes('egreso') || c.includes('salida')) {
            headerColIdx!.withdrawals = idx;
          } else if (c.includes('deposito') || c.includes('credito') || c.includes('abono') || c.includes('ingreso') || c.includes('entrada')) {
            headerColIdx!.deposits = idx;
          } else if (c === 'tipo' || c.includes('naturaleza')) {
            headerColIdx!.type = idx;
          } else if (c.includes('monto') || c.includes('importe') || c.includes('valor') || c.includes('cantidad')) {
            headerColIdx!.amount = idx;
          } else if (c.includes('balance') || c.includes('saldo')) {
            headerColIdx!.balance = idx;
          }
        });
        continue;
      }

      // 2. Parse CSV Row with Header Columns
      if (headerColIdx && headerColIdx.postDate !== undefined) {
        const cols = this.parseCSVLine(line);
        if (cols.length < 2) continue;

        const rawDate = cols[headerColIdx.postDate] || '';
        if (!/\d{1,2}[\/\-\.]\d{1,2}/.test(rawDate)) continue;

        const dateStr = this.parseAnyDate(rawDate);
        const rawDesc = headerColIdx.desc !== undefined ? cols[headerColIdx.desc] : (cols[1] || '');
        if (/^\s*totales?\s*:?\s*$/i.test(rawDesc) || (cols[0] === '' && /totales?/i.test(rawDesc))) continue;

        const txCode = headerColIdx.txCode !== undefined ? cols[headerColIdx.txCode] : undefined;
        const ref = headerColIdx.ref !== undefined ? cols[headerColIdx.ref] : undefined;

        let type: TransactionType = 'EXPENSE';
        let amount = 0;

        // Case A: Distinct Withdrawal & Deposit Columns
        if (headerColIdx.withdrawals !== undefined || headerColIdx.deposits !== undefined) {
          const wStr = headerColIdx.withdrawals !== undefined ? cols[headerColIdx.withdrawals] : '0';
          const dStr = headerColIdx.deposits !== undefined ? cols[headerColIdx.deposits] : '0';
          const bStr = headerColIdx.balance !== undefined ? cols[headerColIdx.balance] : '0';

          const wVal = Math.abs(parseFloat(wStr.replace(/[^\d.-]/g, '')) || 0);
          const dVal = Math.abs(parseFloat(dStr.replace(/[^\d.-]/g, '')) || 0);
          const bVal = Math.abs(parseFloat(bStr.replace(/[^\d.-]/g, '')) || 0);

          if (dVal > 0) {
            type = 'INCOME';
            amount = dVal;
          } else if (wVal > 0) {
            type = 'EXPENSE';
            amount = wVal;
          } else if (bVal > 0 && /balance\s*anterior|saldo\s*anterior|saldo\s*inicial|balance\s*inicial|saldo\s*al|balance\s*al|apertura|deposito|abono|nomina|sueldo/i.test(rawDesc)) {
            type = 'INCOME';
            amount = bVal;
          } else {
            continue; // Skip 0 rows
          }
        }
        // Case B: Single Amount Column
        else if (headerColIdx.amount !== undefined) {
          const amtStr = cols[headerColIdx.amount] || '0';
          const isNegative = amtStr.includes('-') || /^\(.*\)$/.test(amtStr);
          const isExplicitPositive = amtStr.includes('+');
          const parsedNum = Math.abs(parseFloat(amtStr.replace(/[^\d.-]/g, '')) || 0);

          if (parsedNum <= 0) continue;
          amount = parsedNum;

          if (isNegative) {
            type = 'EXPENSE';
          } else if (isExplicitPositive) {
            type = 'INCOME';
          } else if (headerColIdx.type !== undefined) {
            const tStr = normalizeStr(cols[headerColIdx.type]);
            if (tStr.startsWith('c') || tStr.includes('credito') || tStr.includes('deposito') || tStr.includes('abono')) {
              type = 'INCOME';
            } else {
              type = 'EXPENSE';
            }
          } else {
            const descNorm = normalizeStr(rawDesc);
            const isIncomeByDesc = /nomina|sueldo|salario|quincena|deposito|abono|transferencia recibida|ach recibido|lbtr recibido|cashback|interes/.test(descNorm);
            type = isIncomeByDesc ? 'INCOME' : 'EXPENSE';
          }
        }

        if (amount <= 0) continue;

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

      // 3. Fallback: Line-by-line regex parsing for unstructured/copy-pasted text
      if (/fecha|date|descripci[oó]n|concepto|balance|d[eé]bito|cr[eé]dito|monto/i.test(line) && !/\d{1,2}[\/\-\.]\d{1,2}/.test(line)) {
        continue;
      }

      const dateMatch = line.match(/(\d{1,2}[\/\-\.]\d{1,2}(?:[\/\-\.]\d{2,4})?)/);
      if (!dateMatch) continue;

      const dateStr = this.parseAnyDate(dateMatch[1]);

      // Extract currency amounts
      const numbers = Array.from(line.matchAll(/(?:RD\$|USD|US\$|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/g));
      if (numbers.length === 0) continue;

      const validNumbers = numbers
        .map(n => parseFloat(n[1].replace(/,/g, '')))
        .filter(n => !isNaN(n) && n > 0);

      if (validNumbers.length === 0) continue;

      const amount = validNumbers[0];
      const currency: 'DOP' | 'USD' = /US\$|USD/i.test(line) ? 'USD' : 'DOP';

      // Clean description
      let desc = line
        .replace(dateMatch[0], '')
        .replace(/(?:[\+\-])?\s*(?:RD\$|USD|US\$|\$)?\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})/g, '')
        .replace(/[,\t|;]+/g, ' ')
        .replace(/[\+\-:]+$/g, '')
        .replace(/^[\+\-:]+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // Guard against Credit Card purchases being marked as Income
      const isCreditCardExpense = /tarjeta\s+(?:de\s+)?cr[eé]dito|tdc|t\.cr[eé]d/i.test(line) && !/pago\s+recibido|abono/i.test(line);

      let isIncome = false;
      if (!isCreditCardExpense) {
        isIncome = (
          /^\s*\+|\b(dep[oó]sito|deposito|abono|n[oó]mina|nomina|sueldo|salario|honorarios|quincena|transferencia\s+recibida|transf\.?\s*recibida|ach\s*recibido|lbtr\s*recibido|intereses\s*ganados|cashback|devoluci[oó]n|reembolso|acreditaci[oó]n|acreditad[oa])\b/i.test(line) ||
          /\b(abono|n[oó]mina|nomina|quincena|dep[oó]sito|deposito|sueldo|salario)\b/i.test(desc)
        );
      }

      const type: TransactionType = isIncome ? 'INCOME' : 'EXPENSE';
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

    // Safety fallback: If statement contained an initial balance / previous saldo in the header but no deposit rows:
    const hasIncome = entries.some(e => e.type === 'INCOME');
    if (!hasIncome) {
      const initialMatch = text.match(/(?:saldo\s*inicial|balance\s*inicial|saldo\s*anterior|balance\s*anterior|total\s*(?:cr[eé]ditos|dep[oó]sitos|abonos))\s*:?,?\s*(?:RD\$|\$)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2}))/i);
      if (initialMatch) {
        const amt = parseFloat(initialMatch[1].replace(/,/g, ''));
        if (amt > 0) {
          const earliestDate = entries.length > 0 ? entries[entries.length - 1].date : new Date().toISOString().substring(0, 10);
          entries.unshift({
            date: earliestDate,
            rawDate: earliestDate,
            description: 'Saldo Inicial / Balance Anterior',
            amount: Math.round(amt * 100) / 100,
            currency: 'DOP',
            type: 'INCOME'
          });
        }
      }
    }

    return entries;
  }

  /**
   * Reconciles parsed statement entries against database transactions
   */
  public reconcile(userId: string, statementText: string, bankCode: BankCode = 'PROMERICA', autoImport: boolean = true): ReconciliationReport {
    const entries = this.parseStatementText(statementText, bankCode);
    const existingTransactions = dbOps.getTransactions(userId, { bank: bankCode });

    const report: ReconciliationReport = {
      totalStatementEntries: entries.length,
      matchedCount: 0,
      addedCount: 0,
      updatedCount: 0,
      removedCount: 0,
      totalIncomeAmount: 0,
      totalExpenseAmount: 0,
      items: []
    };

    const usedTxIds = new Set<string>();

    // Pass: Match or Add Statement Entries (Statement is the Master Ground Truth)
    for (const entry of entries) {
      if (entry.type === 'INCOME') {
        report.totalIncomeAmount += entry.amount;
      } else {
        report.totalExpenseAmount += entry.amount;
      }

      // Find matching existing transaction (same date +/- 3 days and same amount)
      const match = existingTransactions.find(tx => {
        if (usedTxIds.has(tx.id)) return false;
        const isSameAmount = Math.abs(tx.amount - entry.amount) < 0.05;
        if (!isSameAmount) return false;
        if (tx.type !== entry.type) return false;

        const txDate = tx.date.substring(0, 10);
        const diffDays = Math.abs(new Date(txDate).getTime() - new Date(entry.date).getTime()) / (1000 * 3600 * 24);
        return diffDays <= 3;
      });

      if (match) {
        usedTxIds.add(match.id);
        report.matchedCount++;

        let updated = false;
        if (match.merchant.startsWith('Transacción') || match.merchant.startsWith('Consumo Tarjeta') || match.merchant !== entry.description) {
          const cleanDesc = entry.description.replace(/^Retiro en Cajero \(/, '').replace(/\)$/, '');
          const newCategory = categorizationService.categorize(cleanDesc, undefined, entry.type);
          dbOps.updateTransaction(userId, match.id, {
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
      } else {
        if (autoImport) {
          const category = categorizationService.categorize(entry.description, undefined, entry.type);
          const newTx = dbOps.createTransaction({
            userId,
            bank: bankCode,
            bankName: bankCode === 'PROMERICA' ? 'Banco Promerica' : (bankCode === 'POPULAR' ? 'Banco Popular' : bankCode),
            type: entry.type,
            amount: entry.amount,
            currency: entry.currency,
            merchant: entry.description,
            date: `${entry.date}T12:00:00.000Z`,
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
              : `Gasto oficial detectado e importado al balance.`
          });
        }
      }
    }

    // Save reconciled period for deduplication without destructive deletions
    if (entries.length > 0) {
      const sortedDates = entries.map(e => e.date).sort();
      const minDateStr = sortedDates[0];
      const maxDateStr = sortedDates[sortedDates.length - 1];
      if (minDateStr && maxDateStr) {
        dbOps.saveReconciledPeriod(userId, bankCode, minDateStr, maxDateStr);
      }
    }

    report.totalIncomeAmount = Math.round(report.totalIncomeAmount * 100) / 100;
    report.totalExpenseAmount = Math.round(report.totalExpenseAmount * 100) / 100;

    return report;
  }
}

export const statementService = new StatementService();
