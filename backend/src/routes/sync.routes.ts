import { Router } from 'express';
import { syncService } from '../services/sync.service';
import { dbOps } from '../database/db';
import { bankParserFactory } from '../parsers/parser.factory';
import { categorizationService } from '../services/categorization.service';

const router = Router();

// Trigger full Gmail sync
router.post('/gmail', async (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  
  try {
    const result = await syncService.syncUserGmail(userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      error: err.message || 'Error al ejecutar sincronización'
    });
  }
});

// Re-sync: Clears old cached transactions and re-scans all emails with upgraded parsers
router.post('/resync', async (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  
  try {
    dbOps.clearAllData(userId);
    const result = await syncService.syncUserGmail(userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      error: err.message || 'Error al re-sincronizar con Gmail'
    });
  }
});

// Trigger simulated sync (ideal for demos, testing, and initial setup)
router.post('/simulate', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  
  try {
    const result = syncService.simulateSync(userId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      error: err.message
    });
  }
});

// Parse and ingest raw email text directly (e.g. copied from user's email client)
router.post('/parse-raw', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  const { sender, subject, body } = req.body;

  if (!body) {
    return res.status(400).json({ error: 'El contenido del correo es requerido' });
  }

  const rawEmail = {
    id: `raw-${Date.now()}`,
    from: sender || 'notificaciones@bpd.com.do',
    subject: subject || 'Aviso de Transacción Bancaria',
    date: new Date(),
    bodySnippet: body,
    bodyText: body
  };

  const parsed = bankParserFactory.parseEmail(rawEmail);
  if (!parsed) {
    return res.status(422).json({
      success: false,
      message: 'No se pudo identificar un formato de banco compatible (Popular, BHD, Promerica o Qik) o no se encontró un monto válido en el texto.'
    });
  }

  const category = categorizationService.categorize(
    parsed.merchant,
    parsed.description,
    parsed.type
  );

  const newTx = dbOps.createTransaction({
    ...parsed,
    userId,
    category,
    isManual: false
  });

  return res.json({
    success: true,
    message: `¡Transacción detectada con éxito de ${parsed.bankName}!`,
    transaction: newTx
  });
});

// Reset user data
router.post('/reset', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  dbOps.clearAllData(userId);
  return res.json({ success: true, message: 'Datos reiniciados correctamente' });
});

export default router;
