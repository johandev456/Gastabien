import { Router } from 'express';
import { gmailService } from '../services/gmail.service';
import { dbOps } from '../database/db';
import { CONFIG } from '../config';
import { totpService } from '../services/totp.service';

const router = Router();

// In-memory holder for pending 2FA setup until verified
let pendingSetup: {
  secret: string;
  backupCodes: string[];
  createdAt: number;
} | null = null;

// ==========================================
// 2FA TWO-FACTOR AUTHENTICATION ENDPOINTS
// ==========================================

// Get 2FA Status & Device Session validity
router.get('/2fa/status', (req, res) => {
  const twoFactor = dbOps.getTwoFactorAuth();
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-device-token']) {
    token = (req.headers['x-device-token'] as string).trim();
  } else if (req.query.token) {
    token = (req.query.token as string).trim();
  }

  const is2FAEnabled = !!(twoFactor && twoFactor.enabled);
  const isAuthenticated = is2FAEnabled && !!token && dbOps.validateDeviceSession(token);
  const requiresSetup = !is2FAEnabled;

  return res.json({
    is2FAEnabled,
    isAuthenticated,
    requiresSetup,
    backupCodesRemaining: twoFactor?.backupCodes?.length || 0
  });
});

// Initialize / Request 2FA Setup (Only allowed if not yet configured OR authorized)
router.post('/2fa/setup', (req, res) => {
  try {
    const existing = dbOps.getTwoFactorAuth();
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.headers['x-device-token']) {
      token = (req.headers['x-device-token'] as string).trim();
    }

    if (existing && existing.enabled) {
      // If already enabled, only an already authenticated device can request setup/reconfiguration
      if (!token || !dbOps.validateDeviceSession(token)) {
        return res.status(403).json({
          success: false,
          error: '2FA_ALREADY_CONFIGURED',
          message: 'El 2FA ya está activo y protegido exclusivamente para Johan. Introduce tu código de 6 dígitos para ingresar.'
        });
      }
    }

    // Generate new secret & backup codes
    const secret = totpService.generateSecret(32);
    const backupCodes = totpService.generateBackupCodes(8);
    pendingSetup = {
      secret,
      backupCodes,
      createdAt: Date.now()
    };

    const accountName = 'Johan';
    const issuer = 'GastaBien RD';
    const otpAuthUrl = totpService.getOtpAuthUrl(accountName, secret, issuer);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpAuthUrl)}&margin=10`;

    return res.json({
      success: true,
      secret,
      otpAuthUrl,
      qrCodeUrl,
      backupCodes,
      issuer,
      accountName
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Verify 2FA code (6-digit TOTP or Backup Code) & Issue persistent device session
router.post('/2fa/verify', (req, res) => {
  const { code, isSetup, deviceId } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'Código 2FA requerido' });
  }

  const cleanCode = code.trim().replace(/\s+/g, '');
  const existing2FA = dbOps.getTwoFactorAuth();

  // If in setup mode
  if (isSetup || !existing2FA || !existing2FA.enabled) {
    const secretToVerify = pendingSetup?.secret || req.body.secret;
    if (!secretToVerify) {
      return res.status(400).json({ success: false, error: 'No hay configuración 2FA pendiente. Inicia el setup primero.' });
    }

    const isValid = totpService.verifyToken(secretToVerify, cleanCode, 2);
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Código 2FA incorrecto. Verifica el reloj de tu dispositivo o reintenta.' });
    }

    // Save and activate 2FA permanently
    const backupCodes = pendingSetup?.backupCodes || totpService.generateBackupCodes(8);
    dbOps.saveTwoFactorAuth(secretToVerify, backupCodes, true);
    pendingSetup = null;

    // Issue persistent device session token
    const token = totpService.generateDeviceToken();
    const userAgent = req.headers['user-agent'];
    dbOps.createDeviceSession(token, deviceId, userAgent);

    return res.json({
      success: true,
      token,
      message: '¡Autenticación de 2 Factores activada y dispositivo autorizado exitosamente!',
      backupCodes
    });
  }

  // Active 2FA Verification Mode
  // Check if it's a 6-digit TOTP
  let isValid = false;
  if (cleanCode.length === 6 && /^\d+$/.test(cleanCode)) {
    isValid = totpService.verifyToken(existing2FA.secret, cleanCode, 2);
  }

  // Check if it's a backup code (e.g. XXXX-XXXX)
  if (!isValid && cleanCode.length >= 8) {
    const backupValid = dbOps.verifyAndConsumeBackupCode(cleanCode);
    if (backupValid) {
      isValid = true;
    }
  }

  if (!isValid) {
    return res.status(400).json({ success: false, error: 'Código 2FA inválido o expirado. Revisa tu aplicación de autenticación.' });
  }

  // Issue persistent device session token
  const token = totpService.generateDeviceToken();
  const userAgent = req.headers['user-agent'];
  dbOps.createDeviceSession(token, deviceId, userAgent);

  return res.json({
    success: true,
    token,
    message: 'Dispositivo verificado y sesión iniciada con éxito.'
  });
});

// Reset / Reconfigure 2FA from scratch
router.post('/2fa/reset', (req, res) => {
  dbOps.resetTwoFactorAuth();
  pendingSetup = null;
  return res.json({
    success: true,
    message: '2FA ha sido reiniciado. Ahora puedes configurar tu código QR nuevo desde cero.'
  });
});

// Logout / Revoke device session
router.post('/2fa/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-device-token']) {
    token = (req.headers['x-device-token'] as string).trim();
  } else if (req.body.token) {
    token = req.body.token;
  }

  if (token) {
    dbOps.revokeDeviceSession(token);
  }

  return res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});

// ==========================================
// GOOGLE OAUTH & STATUS ENDPOINTS
// ==========================================

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
