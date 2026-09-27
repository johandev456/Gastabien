import { Router } from 'express';
import { statementService } from '../services/statement.service';
import { BankCode } from '../types';

const router = Router();

// Reconcile and synchronize bank statement (text / CSV / copy-pasted table from online banking)
router.post('/sync', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  const { text, bank, autoImport = true } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'El contenido del estado de cuenta es requerido (texto o tabla).' });
  }

  try {
    const report = statementService.reconcile(userId, text, (bank || 'PROMERICA') as BankCode, autoImport !== false);
    return res.json({
      success: true,
      message: `¡Conciliación completada! ${report.matchedCount} transacciones verificadas, ${report.addedCount} movimientos nuevos agregados y ${report.updatedCount} actualizados.`,
      report
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error al procesar el estado de cuenta'
    });
  }
});

export default router;
