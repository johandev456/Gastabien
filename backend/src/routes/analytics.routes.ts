import { Router } from 'express';
import { transactionService } from '../services/transaction.service';
import { BankCode } from '../types';

const router = Router();

// Full dashboard summary with optional bank filtering (e.g. ?banks=PROMERICA or ?banks=PROMERICA,POPULAR)
router.get('/summary', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'demo-user-id';
  const banksParam = (req.query.banks as string) || (req.query.bank as string);

  let filterBanks: BankCode[] | undefined = undefined;
  if (banksParam && banksParam !== 'ALL') {
    filterBanks = banksParam.split(',').map(b => b.trim().toUpperCase()) as BankCode[];
  }

  const summary = transactionService.getAnalyticsSummary(userId, filterBanks);
  return res.json(summary);
});

export default router;
