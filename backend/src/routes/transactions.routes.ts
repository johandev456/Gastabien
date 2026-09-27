import { Router } from 'express';
import { dbOps } from '../database/db';
import { BankCode, Category } from '../types';
import { categorizationService } from '../services/categorization.service';

const router = Router();

// List transactions
router.get('/', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'demo-user-id';
  const { bank, category, type, search, limit, offset } = req.query;

  const filters = {
    bank: bank ? (bank as BankCode) : undefined,
    category: category ? (category as Category) : undefined,
    type: type ? (type as string) : undefined,
    search: search ? (search as string) : undefined,
    limit: limit ? parseInt(limit as string, 10) : undefined,
    offset: offset ? parseInt(offset as string, 10) : undefined,
  };

  const transactions = dbOps.getTransactions(userId, filters);
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
  return res.json(tx);
});

// Create manual transaction
router.post('/', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  const { bank, bankName, type, amount, currency, merchant, accountReference, date, notes, category } = req.body;

  if (!amount || !merchant) {
    return res.status(400).json({ error: 'Monto y comercio son obligatorios' });
  }

  const assignedCategory = category || categorizationService.categorize(merchant, notes, type || 'EXPENSE');

  const created = dbOps.createTransaction({
    userId,
    bank: bank || 'MANUAL',
    bankName: bankName || 'Manual',
    type: type || 'EXPENSE',
    amount: parseFloat(amount),
    currency: currency || 'DOP',
    merchant,
    accountReference,
    date: date || new Date().toISOString(),
    category: assignedCategory,
    notes,
    isManual: true
  });

  return res.status(201).json(created);
});

// Update transaction
router.put('/:id', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  const { category, merchant, amount, notes, type, date } = req.body;

  const success = dbOps.updateTransaction(userId, req.params.id, {
    category,
    merchant,
    amount: amount !== undefined ? parseFloat(amount) : undefined,
    notes,
    type,
    date
  });

  if (!success) {
    return res.status(404).json({ error: 'Transacción no encontrada o no pertenece al usuario' });
  }

  const updated = dbOps.getTransactionById(userId, req.params.id);
  return res.json(updated);
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
