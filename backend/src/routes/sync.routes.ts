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
    // Business failures (e.g. Gmail not connected) are returned as 200 with status FAILED
    // so clients can read the reason instead of a generic HTTP error.
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({
      status: 'FAILED',
      error: err.message || 'Error al ejecutar sincronización'
    });
  }
});

// Re-sync: removes ONLY Gmail-sourced transactions and re-scans the whole mailbox with the
// current parsers. Manual entries, statement imports, reconciled periods and ignored IDs are kept.
router.post('/resync', async (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || req.body.userId || 'demo-user-id';
  
  try {
    const user = dbOps.getUser(userId);
    if (!user || (!user.google_refresh_token && !user.google_access_token)) {
      return res.json({ status: 'FAILED', emailsProcessed: 0, newTransactionsCount: 0, transactions: [], error: 'Usuario no ha conectado su cuenta de Gmail.' });
    }
    if (syncService.isSyncing(userId)) {
      return res.json({ status: 'FAILED', emailsProcessed: 0, newTransactionsCount: 0, transactions: [], error: 'Ya hay una sincronización en curso. Espera a que termine.' });
    }
    // Clearing happens inside syncUserGmail, under the per-user lock
    const result = await syncService.syncUserGmail(userId, { full: true, clearEmailTransactions: true });
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

  const dupCheck = dbOps.isDuplicateTransaction(userId, {
    bank: parsed.bank,
    type: parsed.type,
    amount: parsed.amount,
    currency: parsed.currency,
    merchant: parsed.merchant,
    description: parsed.description,
    date: parsed.date
  });
  if (dupCheck.isDuplicate) {
    return res.status(409).json({
      success: false,
      message: 'Esta transacción ya existe en tus movimientos (posible duplicado).'
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
