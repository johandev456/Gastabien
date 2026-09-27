"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const statement_service_1 = require("../services/statement.service");
const router = (0, express_1.Router)();
// Reconcile and synchronize bank statement (text / CSV / copy-pasted table from online banking)
router.post('/sync', (req, res) => {
    const userId = req.headers['x-user-id'] || req.body.userId || 'demo-user-id';
    const { text, bank, autoImport = true } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'El contenido del estado de cuenta es requerido (texto o tabla).' });
    }
    try {
        const report = statement_service_1.statementService.reconcile(userId, text, (bank || 'PROMERICA'), autoImport !== false);
        return res.json({
            success: true,
            message: `¡Conciliación completada! ${report.matchedCount} transacciones verificadas, ${report.addedCount} movimientos nuevos agregados y ${report.updatedCount} actualizados.`,
            report
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || 'Error al procesar el estado de cuenta'
        });
    }
});
exports.default = router;
