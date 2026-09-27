import { Router } from 'express';
import { SUPPORTED_BANKS } from '../config';

const router = Router();

// Get list of supported Dominican banks and their configurations
router.get('/', (req, res) => {
  return res.json({
    supportedBanks: Object.values(SUPPORTED_BANKS)
  });
});

export default router;
