"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../database/db");
const categorization_service_1 = require("../services/categorization.service");
const transaction_service_1 = require("../services/transaction.service");
const config_1 = require("../config");
const VALID_TYPES = ['EXPENSE', 'INCOME', 'TRANSFER'];
const VALID_CURRENCIES = ['DOP', 'USD'];
const VALID_BANKS = [...Object.keys(config_1.SUPPORTED_BANKS), 'MANUAL'];
function parseAmount(value) {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0 || n > 100_000_000)
        return null;
    return Math.round(n * 100) / 100;
}
/** Accepts full ISO strings or YYYY-MM-DD (interpreted as noon DR time). */
function parseDateInput(value) {
    if (typeof value !== 'string' || !value.trim())
        return null;
    const v = value.trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T16:00:00.000Z` : v;
    const t = new Date(iso).getTime();
    return isNaN(t) ? null : new Date(t).toISOString();
}
function validationError(res, message) {
    return res.status(400).json({ error: message, message });
}
const router = (0, express_1.Router)();
// List transactions
router.get('/', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    const { bank, category, type, search, month, limit, offset } = req.query;
    const filters = {
        bank: bank ? bank : undefined,
        category: category ? category : undefined,
        type: type ? type : undefined,
        search: search ? search : undefined,
        month: month ? month : undefined,
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
    const parsedAmount = parseAmount(amount);
    if (parsedAmount === null || !merchant || typeof merchant !== 'string' || !merchant.trim()) {
        return validationError(res, 'Monto (mayor que 0) y comercio son obligatorios');
    }
    if (type !== undefined && !VALID_TYPES.includes(type))
        return validationError(res, 'Tipo de transacción inválido');
    if (currency !== undefined && !VALID_CURRENCIES.includes(currency))
        return validationError(res, 'Moneda inválida');
    if (bank !== undefined && !VALID_BANKS.includes(bank))
        return validationError(res, 'Banco inválido');
    if (category !== undefined && category !== '' && !(category in config_1.CATEGORY_COLORS))
        return validationError(res, 'Categoría inválida');
    const parsedDate = date !== undefined && date !== '' ? parseDateInput(date) : new Date().toISOString();
    if (!parsedDate)
        return validationError(res, 'Fecha inválida');
    const assignedCategory = category || categorization_service_1.categorizationService.categorize(merchant, notes, type || 'EXPENSE');
    const created = db_1.dbOps.createTransaction({
        userId,
        bank: bank || 'MANUAL',
        bankName: bankName || (bank && config_1.SUPPORTED_BANKS[bank] ? config_1.SUPPORTED_BANKS[bank].name : 'Manual'),
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
    const userId = req.headers['x-user-id'] || req.body.userId || 'demo-user-id';
    const { category, merchant, amount, currency, notes, type, date } = req.body;
    let parsedAmount;
    if (amount !== undefined) {
        const n = parseAmount(amount);
        if (n === null)
            return validationError(res, 'Monto inválido');
        parsedAmount = n;
    }
    if (type !== undefined && !VALID_TYPES.includes(type))
        return validationError(res, 'Tipo de transacción inválido');
    if (currency !== undefined && !VALID_CURRENCIES.includes(currency))
        return validationError(res, 'Moneda inválida');
    if (category !== undefined && !(category in config_1.CATEGORY_COLORS))
        return validationError(res, 'Categoría inválida');
    if (merchant !== undefined && (typeof merchant !== 'string' || !merchant.trim()))
        return validationError(res, 'Comercio inválido');
    let parsedDate;
    if (date !== undefined) {
        const d = parseDateInput(date);
        if (!d)
            return validationError(res, 'Fecha inválida');
        parsedDate = d;
    }
    const success = db_1.dbOps.updateTransaction(userId, req.params.id, {
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
    const updated = db_1.dbOps.getTransactionById(userId, req.params.id);
    return res.json((0, transaction_service_1.enrichTransaction)(updated));
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
