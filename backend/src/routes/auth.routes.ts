import { Router } from 'express';
import { gmailService } from '../services/gmail.service';
import { dbOps } from '../database/db';
import { CONFIG } from '../config';

const router = Router();

// Get Google OAuth URL
router.get('/google/url', (req, res) => {
  const userId = (req.query.userId as string) || 'demo-user-id';
  try {
    const savedConfig = dbOps.getGoogleConfig();
    if (savedConfig?.clientId && (!CONFIG.GOOGLE.CLIENT_ID || CONFIG.GOOGLE.CLIENT_ID.length < 5)) {
      CONFIG.GOOGLE.CLIENT_ID = savedConfig.clientId;
    }
    if (savedConfig?.clientSecret && (!CONFIG.GOOGLE.CLIENT_SECRET || CONFIG.GOOGLE.CLIENT_SECRET.length < 5)) {
      CONFIG.GOOGLE.CLIENT_SECRET = savedConfig.clientSecret;
    }

    if (!CONFIG.GOOGLE.CLIENT_ID || !CONFIG.GOOGLE.CLIENT_SECRET) {
      return res.json({
        configured: false,
        message: 'Credenciales de Google OAuth no configuradas en el servidor.',
        url: null
      });
    }
    const url = gmailService.getAuthUrl(userId);
    return res.json({ configured: true, url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Save / Update Google OAuth credentials dynamically
router.post('/google/config', (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Client ID y Client Secret son requeridos' });
  }
  CONFIG.GOOGLE.CLIENT_ID = clientId.trim();
  CONFIG.GOOGLE.CLIENT_SECRET = clientSecret.trim();
  dbOps.saveGoogleConfig(clientId.trim(), clientSecret.trim());
  return res.json({
    success: true,
    message: 'Credenciales de Google OAuth guardadas exitosamente.',
    configured: true
  });
});

// Google OAuth callback
router.get('/google/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = (req.query.state as string) || 'demo-user-id';

  if (!code) {
    return res.redirect(`${CONFIG.FRONTEND_URL}?auth_error=missing_code`);
  }

  try {
    const result = await gmailService.handleAuthCallback(code, state);
    return res.redirect(`${CONFIG.FRONTEND_URL}?auth_success=true&email=${encodeURIComponent(result.email)}`);
  } catch (err: any) {
    console.error('OAuth Callback error:', err);
    return res.redirect(`${CONFIG.FRONTEND_URL}?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// Check current user / Gmail connection status
router.get('/status', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'demo-user-id';
  const user = dbOps.getUser(userId);

  if (!user) {
    return res.json({
      connected: false,
      user: null,
      hasGoogleAuth: false
    });
  }

  return res.json({
    connected: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      lastSyncAt: user.last_sync_at,
      hasGmailConnected: !!(user.google_refresh_token || user.google_access_token)
    }
  });
});

export default router;
