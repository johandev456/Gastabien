import { Router } from 'express';
import { dbOps } from '../database/db';
import { BankCode, Category } from '../types';
import { categorizationService } from '../services/categorization.service';
import { enrichTransaction } from '../services/transaction.service';
import { CATEGORY_COLORS, SUPPORTED_BANKS } from '../config';

const VALID_TYPES = ['EXPENSE', 'INCOME', 'TRANSFER'];
const VALID_CURRENCIES = ['DOP', 'USD'];
const VALID_BANKS = [...Object.keys(SUPPORTED_BANKS), 'MANUAL'];

function parseAmount(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0 || n > 100_000_000) return null;
  return Math.round(n * 100) / 100;
}

/** Accepts full ISO strings or YYYY-MM-DD (interpreted as noon DR time). */
function parseDateInput(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const v = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T16:00:00.000Z` : v;
  const t = new Date(iso).getTime();
  return isNaN(t) ? null : new Date(t).toISOString();
}

const isValidCategory = (c: unknown): boolean =>
  typeof c === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, c);

function validationError(res: any, message: string) {
  return res.status(400).json({ error: message, message });
}

const router = Router();

// List transactions
router.get('/', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'demo-user-id';
  const { bank, category, type, search, month, limit, offset } = req.query;

  const filters = {
    bank: bank ? (bank as BankCode) : undefined,
    category: category ? (category as Category) : undefined,
    type: type ? (type as string) : undefined,
    search: search ? (search as string) : undefined,
    month: month ? (month as string) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  };


  const rawTransactions = dbOps.getTransactions(userId, filters);
  const transactions = rawTransactions.map(enrichTransaction);
  return res.json({
    count: transactions.length,
    transactions
  });
});

// Get single transaction
router.get('/:id', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'demo-user-id';
  const tx = dbOps.getTransactionById(userId, req.params.id);
  if (!tx) {
    return res.status(404).json({ error: 'Transacción no encontrada' });
  }
  return res.json(enrichTransaction(tx));
});

// Create manual transaction
router.post('/', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  const { bank, bankName, type, amount, currency, merchant, accountReference, date, notes, category } = req.body;

  const parsedAmount = parseAmount(amount);
  if (parsedAmount === null || !merchant || typeof merchant !== 'string' || !merchant.trim()) {
    return validationError(res, 'Monto (mayor que 0) y comercio son obligatorios');
  }
  if (type !== undefined && !VALID_TYPES.includes(type)) return validationError(res, 'Tipo de transacción inválido');
  if (currency !== undefined && !VALID_CURRENCIES.includes(currency)) return validationError(res, 'Moneda inválida');
  if (bank !== undefined && !VALID_BANKS.includes(bank)) return validationError(res, 'Banco inválido');
  if (category !== undefined && category !== '' && !isValidCategory(category)) return validationError(res, 'Categoría inválida');
  const parsedDate = date !== undefined && date !== '' ? parseDateInput(date) : new Date().toISOString();
  if (!parsedDate) return validationError(res, 'Fecha inválida');

  const assignedCategory = category || categorizationService.categorize(merchant, notes, type || 'EXPENSE');

  const created = dbOps.createTransaction({
    userId,
    bank: bank || 'MANUAL',
    bankName: bankName || (bank && SUPPORTED_BANKS[bank] ? SUPPORTED_BANKS[bank].name : 'Manual'),
    type: type || 'EXPENSE',
    amount: parsedAmount,
    currency: currency || 'DOP',
    merchant: merchant.trim(),
    accountReference,
    date: parsedDate,
    category: assignedCategory,
    notes,
    isManual: true
  });

  return res.status(201).json(created);
});

// Update transaction
router.put('/:id', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  const { category, merchant, amount, currency, notes, type, date } = req.body;

  let parsedAmount: number | undefined;
  if (amount !== undefined) {
    const n = parseAmount(amount);
    if (n === null) return validationError(res, 'Monto inválido');
    parsedAmount = n;
  }
  if (type !== undefined && !VALID_TYPES.includes(type)) return validationError(res, 'Tipo de transacción inválido');
  if (currency !== undefined && !VALID_CURRENCIES.includes(currency)) return validationError(res, 'Moneda inválida');
  if (category !== undefined && !isValidCategory(category)) return validationError(res, 'Categoría inválida');
  if (merchant !== undefined && (typeof merchant !== 'string' || !merchant.trim())) return validationError(res, 'Comercio inválido');
  let parsedDate: string | undefined;
  if (date !== undefined) {
    const d = parseDateInput(date);
    if (!d) return validationError(res, 'Fecha inválida');
    parsedDate = d;
  }

  const success = dbOps.updateTransaction(userId, req.params.id, {
    category,
    merchant: merchant !== undefined ? merchant.trim() : undefined,
    amount: parsedAmount,
    currency,
    // Empty string clears the notes
    notes: notes === null ? '' : notes,
    type,
    date: parsedDate
  });

  if (!success) {
    return res.status(404).json({ error: 'Transacción no encontrada o no pertenece al usuario' });
  }

  const updated = dbOps.getTransactionById(userId, req.params.id);
  return res.json(enrichTransaction(updated!));
});

// Delete all transactions for user
router.delete('/', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'demo-user-id';
  dbOps.clearAllData(userId);
  return res.json({ success: true, message: 'Todas las transacciones y datos han sido eliminados con éxito' });
});

// Delete single transaction
router.delete('/:id', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'demo-user-id';
  const success = dbOps.deleteTransaction(userId, req.params.id);
  if (!success) {
    return res.status(404).json({ error: 'Transacción no encontrada' });
  }
  return res.json({ success: true, message: 'Transacción eliminada con éxito' });
});

export default router;
