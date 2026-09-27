"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transaction_service_1 = require("../services/transaction.service");
const router = (0, express_1.Router)();
// Full dashboard summary with optional bank filtering (e.g. ?banks=PROMERICA or ?banks=PROMERICA,POPULAR)
router.get('/summary', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    const banksParam = req.query.banks || req.query.bank;
    let filterBanks = undefined;
    if (banksParam && banksParam !== 'ALL') {
        filterBanks = banksParam.split(',').map(b => b.trim().toUpperCase());
    }
    const summary = transaction_service_1.transactionService.getAnalyticsSummary(userId, filterBanks);
    return res.json(summary);
});
exports.default = router;
