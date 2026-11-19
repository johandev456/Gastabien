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
    const bankCode = (bank || 'PROMERICA');
    if (!['POPULAR', 'BHD', 'PROMERICA', 'QIK'].includes(bankCode)) {
        return res.status(400).json({ success: false, error: 'Banco inválido para el estado de cuenta.', message: 'Banco inválido para el estado de cuenta.' });
    }
    try {
        const report = statement_service_1.statementService.reconcile(userId, text, bankCode, autoImport !== false);
        if (report.totalStatementEntries === 0) {
            return res.status(422).json({
                success: false,
                error: 'No se encontraron movimientos válidos en el estado de cuenta. Verifica el formato (CSV o tabla copiada).',
                message: 'No se encontraron movimientos válidos en el estado de cuenta. Verifica el formato (CSV o tabla copiada).',
                report
            });
        }
        return res.json({
            success: true,
            message: `¡Estado de cuenta aplicado! ${report.totalStatementEntries} movimientos oficiales importados (${report.updatedCount} reemplazaron registros previos, ${report.addedCount} son nuevos) y ${report.removedCount} registros anteriores del período fueron reemplazados.`,
            report
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            error: err.message || 'Error al procesar el estado de cuenta',
            message: err.message || 'Error al procesar el estado de cuenta'
        });
    }
});
exports.default = router;
