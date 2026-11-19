import { Router, Request } from 'express';
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

const PENDING_SETUP_TTL_MS = 10 * 60 * 1000;

function getPendingSetup() {
  if (pendingSetup && Date.now() - pendingSetup.createdAt > PENDING_SETUP_TTL_MS) {
    pendingSetup = null;
  }
  return pendingSetup;
}

/** Session token from headers only (never from the query string: it would leak into logs). */
export function getRequestToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim() || undefined;
  }
  if (req.headers['x-device-token']) {
    return (req.headers['x-device-token'] as string).trim() || undefined;
  }
  return undefined;
}

function hasValidSession(req: Request): boolean {
  const token = getRequestToken(req);
  return !!token && dbOps.validateDeviceSession(token);
}

/** Sensitive config changes require an authorized session whenever 2FA is active. */
function canChangeConfig(req: Request): boolean {
  const twoFactor = dbOps.getTwoFactorAuth();
  if (!twoFactor || !twoFactor.enabled) return true;
  return hasValidSession(req);
}

// ---- Simple in-memory brute-force protection for code verification ----
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const failedAttempts = new Map<string, { count: number; firstAt: number }>();

const MAX_TRACKED_CLIENTS = 1000;

/** req.ip honours `trust proxy` (set in index.ts), so spoofed X-Forwarded-For entries are ignored. */
function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** Drops expired entries so one-off clients don't accumulate forever. */
function pruneFailures() {
  const now = Date.now();
  for (const [key, entry] of failedAttempts) {
    if (now - entry.firstAt > ATTEMPT_WINDOW_MS) failedAttempts.delete(key);
  }
  // Hard cap as a last resort (oldest entries first, Map keeps insertion order)
  while (failedAttempts.size > MAX_TRACKED_CLIENTS) {
    const oldest = failedAttempts.keys().next().value;
    if (oldest === undefined) break;
    failedAttempts.delete(oldest);
  }
}

function isRateLimited(req: Request): number {
  const entry = failedAttempts.get(clientKey(req));
  if (!entry) return 0;
  const elapsed = Date.now() - entry.firstAt;
  if (elapsed > ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(clientKey(req));
    return 0;
  }
  return entry.count >= MAX_FAILED_ATTEMPTS ? Math.ceil((ATTEMPT_WINDOW_MS - elapsed) / 1000) : 0;
}

function registerFailure(req: Request) {
  const key = clientKey(req);
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
    failedAttempts.delete(key);
    failedAttempts.set(key, { count: 1, firstAt: Date.now() });
    if (failedAttempts.size > MAX_TRACKED_CLIENTS / 2) pruneFailures();
  } else {
    entry.count++;
  }
}

function clearFailures(req: Request) {
  failedAttempts.delete(clientKey(req));
}

// ==========================================
// 2FA TWO-FACTOR AUTHENTICATION ENDPOINTS
// ==========================================

// Get 2FA Status & Device Session validity
router.get('/2fa/status', (req, res) => {
  const twoFactor = dbOps.getTwoFactorAuth();
  const token = getRequestToken(req);

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

    if (existing && existing.enabled) {
      // If already enabled, only an already authenticated device can request setup/reconfiguration
      if (!hasValidSession(req)) {
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

  const retryAfter = isRateLimited(req);
  if (retryAfter > 0) {
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      error: `Demasiados intentos fallidos. Espera ${Math.ceil(retryAfter / 60)} minuto(s) e inténtalo de nuevo.`
    });
  }

  const cleanCode = code.trim().replace(/\s+/g, '');
  const existing2FA = dbOps.getTwoFactorAuth();
  const is2FAEnabled = !!(existing2FA && existing2FA.enabled);

  // Setup mode: only when 2FA is not active yet, or when an ALREADY AUTHORIZED device
  // is re-configuring. The secret always comes from the server-side pending setup,
  // never from the request body.
  const setupMode = !is2FAEnabled || (isSetup === true && hasValidSession(req));
  if (setupMode) {
    const pending = getPendingSetup();
    if (!pending) {
      return res.status(400).json({ success: false, error: 'No hay configuración 2FA pendiente o expiró. Inicia el setup de nuevo.' });
    }

    const isValid = totpService.verifyToken(pending.secret, cleanCode, 1);
    if (!isValid) {
      registerFailure(req);
      return res.status(400).json({ success: false, error: 'Código 2FA incorrecto. Verifica el reloj de tu dispositivo o reintenta.' });
    }
    clearFailures(req);

    // Save and activate 2FA permanently (re-configuration revokes all other devices)
    const secretToVerify = pending.secret;
    const backupCodes = pending.backupCodes;
    if (is2FAEnabled) {
      dbOps.revokeAllDeviceSessions();
    }
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
    isValid = totpService.verifyToken(existing2FA!.secret, cleanCode, 1);
  }

  // Check if it's a backup code (e.g. XXXX-XXXX)
  if (!isValid && cleanCode.length >= 8) {
    const backupValid = dbOps.verifyAndConsumeBackupCode(cleanCode);
    if (backupValid) {
      isValid = true;
    }
  }

  if (!isValid) {
    registerFailure(req);
    return res.status(400).json({ success: false, error: 'Código 2FA inválido o expirado. Revisa tu aplicación de autenticación.' });
  }
  clearFailures(req);

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
// Requires an authorized session, or a valid backup code when the device is locked out.
router.post('/2fa/reset', (req, res) => {
  const twoFactor = dbOps.getTwoFactorAuth();
  if (twoFactor && twoFactor.enabled && !hasValidSession(req)) {
    const retryAfter = isRateLimited(req);
    if (retryAfter > 0) {
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ success: false, error: 'Demasiados intentos fallidos. Espera unos minutos.' });
    }
    const backupCode = typeof req.body?.backupCode === 'string' ? req.body.backupCode.trim() : '';
    if (!backupCode || !dbOps.verifyAndConsumeBackupCode(backupCode)) {
      registerFailure(req);
      return res.status(401).json({
        success: false,
        error: 'Para reiniciar el 2FA necesitas una sesión autorizada o un código de respaldo válido.'
      });
    }
    clearFailures(req);
  }
  dbOps.resetTwoFactorAuth();
  pendingSetup = null;
  return res.json({
    success: true,
    message: '2FA ha sido reiniciado. Ahora puedes configurar tu código QR nuevo desde cero.'
  });
});

// Logout / Revoke device session
router.post('/2fa/logout', (req, res) => {
  const token = getRequestToken(req) || (typeof req.body?.token === 'string' ? req.body.token : undefined);

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
  if (!canChangeConfig(req)) {
    return res.status(401).json({ error: '2FA_REQUIRED', message: 'Se requiere una sesión autorizada para cambiar la configuración.' });
  }
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

// Check Supabase connection status
router.get('/supabase/status', async (req, res) => {
  const { isSupabaseConfigured, supabaseOps } = await import('../database/supabase');
  const configured = isSupabaseConfigured();
  if (!configured) {
    return res.json({
      configured: false,
      connected: false,
      message: 'Supabase no está configurado. Agrega SUPABASE_URL y SUPABASE_KEY en las variables de entorno.'
    });
  }

  const test = await supabaseOps.testConnection();
  return res.json({
    configured: true,
    connected: test.connected,
    message: test.message
  });
});

// Configure Supabase dynamically
router.post('/supabase/config', async (req, res) => {
  if (!canChangeConfig(req)) {
    return res.status(401).json({ success: false, error: '2FA_REQUIRED', message: 'Se requiere una sesión autorizada para cambiar la configuración.' });
  }
  const { url, key } = req.body;
  if (!url || !key) {
    return res.status(400).json({ success: false, error: 'URL y KEY de Supabase son requeridos.' });
  }

  CONFIG.SUPABASE.URL = url.trim();
  CONFIG.SUPABASE.KEY = key.trim();
  process.env.SUPABASE_URL = url.trim();
  process.env.SUPABASE_KEY = key.trim();

  const { supabaseOps } = await import('../database/supabase');
  const test = await supabaseOps.testConnection();
  return res.json({
    success: test.connected,
    configured: true,
    connected: test.connected,
    message: test.message
  });
});

// Check current user / Gmail connection status
router.get('/status', (req, res) => {
  const userId = (req.headers['x-user-id'] as string) || (req.query.userId as string) || 'demo-user-id';
  const user = dbOps.getUser(userId);

  const hasGoogleAuth = !!(CONFIG.GOOGLE.CLIENT_ID && CONFIG.GOOGLE.CLIENT_SECRET);
  if (!user) {
    return res.json({
      connected: false,
      user: null,
      hasGoogleAuth
    });
  }

  return res.json({
    connected: true,
    hasGoogleAuth,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      lastSyncAt: user.last_sync_at,
      needsReconnect: !!user.needs_reconnect,
      hasGmailConnected: !!(user.google_refresh_token || user.google_access_token)
    }
  });
});

export default router;

