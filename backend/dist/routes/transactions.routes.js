"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../database/db");
const categorization_service_1 = require("../services/categorization.service");
const transaction_service_1 = require("../services/transaction.service");
const router = (0, express_1.Router)();
// List transactions
router.get('/', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    const { bank, category, type, search, limit, offset } = req.query;
    const filters = {
        bank: bank ? bank : undefined,
        category: category ? category : undefined,
        type: type ? type : undefined,
        search: search ? search : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined,
    };
    const rawTransactions = db_1.dbOps.getTransactions(userId, filters);
    const transactions = rawTransactions.map(transaction_service_1.enrichTransaction);
    return res.json({
        count: transactions.length,
        transactions
    });
});
// Get single transaction
router.get('/:id', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    const tx = db_1.dbOps.getTransactionById(userId, req.params.id);
    if (!tx) {
        return res.status(404).json({ error: 'Transacción no encontrada' });
    }
    return res.json((0, transaction_service_1.enrichTransaction)(tx));
});
// Create manual transaction
router.post('/', (req, res) => {
    const userId = req.headers['x-user-id'] || req.body.userId || 'demo-user-id';
    const { bank, bankName, type, amount, currency, merchant, accountReference, date, notes, category } = req.body;
    if (!amount || !merchant) {
        return res.status(400).json({ error: 'Monto y comercio son obligatorios' });
    }
    const assignedCategory = category || categorization_service_1.categorizationService.categorize(merchant, notes, type || 'EXPENSE');
    const created = db_1.dbOps.createTransaction({
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
    const userId = req.headers['x-user-id'] || req.body.userId || 'demo-user-id';
    const { category, merchant, amount, notes, type, date } = req.body;
    const success = db_1.dbOps.updateTransaction(userId, req.params.id, {
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
    const updated = db_1.dbOps.getTransactionById(userId, req.params.id);
    return res.json(updated);
});
// Delete all transactions for user
router.delete('/', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    db_1.dbOps.clearAllData(userId);
    return res.json({ success: true, message: 'Todas las transacciones y datos han sido eliminados con éxito' });
});
// Delete single transaction
router.delete('/:id', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    const success = db_1.dbOps.deleteTransaction(userId, req.params.id);
    if (!success) {
        return res.status(404).json({ error: 'Transacción no encontrada' });
    }
    return res.json({ success: true, message: 'Transacción eliminada con éxito' });
});
exports.default = router;
