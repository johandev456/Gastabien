"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transaction_service_1 = require("../services/transaction.service");
const router = (0, express_1.Router)();
// Full dashboard summary with optional bank and month filtering (e.g. ?banks=PROMERICA&month=2026-09)
router.get('/summary', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    const banksParam = req.query.banks || req.query.bank;
    const monthParam = req.query.month;
    let filterBanks = undefined;
    if (banksParam && banksParam !== 'ALL') {
        filterBanks = banksParam.split(',').map(b => b.trim().toUpperCase());
    }
    const summary = transaction_service_1.transactionService.getAnalyticsSummary(userId, filterBanks, monthParam);
    return res.json(summary);
});
exports.default = router;
