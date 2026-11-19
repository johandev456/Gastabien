"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestToken = getRequestToken;
const express_1 = require("express");
const gmail_service_1 = require("../services/gmail.service");
const db_1 = require("../database/db");
const config_1 = require("../config");
const totp_service_1 = require("../services/totp.service");
const router = (0, express_1.Router)();
// In-memory holder for pending 2FA setup until verified
let pendingSetup = null;
const PENDING_SETUP_TTL_MS = 10 * 60 * 1000;
function getPendingSetup() {
    if (pendingSetup && Date.now() - pendingSetup.createdAt > PENDING_SETUP_TTL_MS) {
        pendingSetup = null;
    }
    return pendingSetup;
}
/** Session token from headers only (never from the query string: it would leak into logs). */
function getRequestToken(req) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7).trim() || undefined;
    }
    if (req.headers['x-device-token']) {
        return req.headers['x-device-token'].trim() || undefined;
    }
    return undefined;
}
function hasValidSession(req) {
    const token = getRequestToken(req);
    return !!token && db_1.dbOps.validateDeviceSession(token);
}
/** Sensitive config changes require an authorized session whenever 2FA is active. */
function canChangeConfig(req) {
    const twoFactor = db_1.dbOps.getTwoFactorAuth();
    if (!twoFactor || !twoFactor.enabled)
        return true;
    return hasValidSession(req);
}
// ---- Simple in-memory brute-force protection for code verification ----
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const failedAttempts = new Map();
function clientKey(req) {
    const fwd = req.headers['x-forwarded-for']?.split(',')[0]?.trim();
    return fwd || req.ip || 'unknown';
}
function isRateLimited(req) {
    const entry = failedAttempts.get(clientKey(req));
    if (!entry)
        return 0;
    const elapsed = Date.now() - entry.firstAt;
    if (elapsed > ATTEMPT_WINDOW_MS) {
        failedAttempts.delete(clientKey(req));
        return 0;
    }
    return entry.count >= MAX_FAILED_ATTEMPTS ? Math.ceil((ATTEMPT_WINDOW_MS - elapsed) / 1000) : 0;
}
function registerFailure(req) {
    const key = clientKey(req);
    const entry = failedAttempts.get(key);
    if (!entry || Date.now() - entry.firstAt > ATTEMPT_WINDOW_MS) {
        failedAttempts.set(key, { count: 1, firstAt: Date.now() });
    }
    else {
        entry.count++;
    }
}
function clearFailures(req) {
    failedAttempts.delete(clientKey(req));
}
// ==========================================
// 2FA TWO-FACTOR AUTHENTICATION ENDPOINTS
// ==========================================
// Get 2FA Status & Device Session validity
router.get('/2fa/status', (req, res) => {
    const twoFactor = db_1.dbOps.getTwoFactorAuth();
    const token = getRequestToken(req);
    const is2FAEnabled = !!(twoFactor && twoFactor.enabled);
    const isAuthenticated = is2FAEnabled && !!token && db_1.dbOps.validateDeviceSession(token);
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
        const existing = db_1.dbOps.getTwoFactorAuth();
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
        const secret = totp_service_1.totpService.generateSecret(32);
        const backupCodes = totp_service_1.totpService.generateBackupCodes(8);
        pendingSetup = {
            secret,
            backupCodes,
            createdAt: Date.now()
        };
        const accountName = 'Johan';
        const issuer = 'GastaBien RD';
        const otpAuthUrl = totp_service_1.totpService.getOtpAuthUrl(accountName, secret, issuer);
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
    }
    catch (err) {
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
    const existing2FA = db_1.dbOps.getTwoFactorAuth();
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
        const isValid = totp_service_1.totpService.verifyToken(pending.secret, cleanCode, 1);
        if (!isValid) {
            registerFailure(req);
            return res.status(400).json({ success: false, error: 'Código 2FA incorrecto. Verifica el reloj de tu dispositivo o reintenta.' });
        }
        clearFailures(req);
        // Save and activate 2FA permanently (re-configuration revokes all other devices)
        const secretToVerify = pending.secret;
        const backupCodes = pending.backupCodes;
        if (is2FAEnabled) {
            db_1.dbOps.revokeAllDeviceSessions();
        }
        db_1.dbOps.saveTwoFactorAuth(secretToVerify, backupCodes, true);
        pendingSetup = null;
        // Issue persistent device session token
        const token = totp_service_1.totpService.generateDeviceToken();
        const userAgent = req.headers['user-agent'];
        db_1.dbOps.createDeviceSession(token, deviceId, userAgent);
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
        isValid = totp_service_1.totpService.verifyToken(existing2FA.secret, cleanCode, 1);
    }
    // Check if it's a backup code (e.g. XXXX-XXXX)
    if (!isValid && cleanCode.length >= 8) {
        const backupValid = db_1.dbOps.verifyAndConsumeBackupCode(cleanCode);
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
    const token = totp_service_1.totpService.generateDeviceToken();
    const userAgent = req.headers['user-agent'];
    db_1.dbOps.createDeviceSession(token, deviceId, userAgent);
    return res.json({
        success: true,
        token,
        message: 'Dispositivo verificado y sesión iniciada con éxito.'
    });
});
// Reset / Reconfigure 2FA from scratch
// Requires an authorized session, or a valid backup code when the device is locked out.
router.post('/2fa/reset', (req, res) => {
    const twoFactor = db_1.dbOps.getTwoFactorAuth();
    if (twoFactor && twoFactor.enabled && !hasValidSession(req)) {
        const retryAfter = isRateLimited(req);
        if (retryAfter > 0) {
            res.setHeader('Retry-After', String(retryAfter));
            return res.status(429).json({ success: false, error: 'Demasiados intentos fallidos. Espera unos minutos.' });
        }
        const backupCode = typeof req.body?.backupCode === 'string' ? req.body.backupCode.trim() : '';
        if (!backupCode || !db_1.dbOps.verifyAndConsumeBackupCode(backupCode)) {
            registerFailure(req);
            return res.status(401).json({
                success: false,
                error: 'Para reiniciar el 2FA necesitas una sesión autorizada o un código de respaldo válido.'
            });
        }
        clearFailures(req);
    }
    db_1.dbOps.resetTwoFactorAuth();
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
        db_1.dbOps.revokeDeviceSession(token);
    }
    return res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
});
// ==========================================
// GOOGLE OAUTH & STATUS ENDPOINTS
// ==========================================
// Get Google OAuth URL
router.get('/google/url', (req, res) => {
    const userId = req.query.userId || 'demo-user-id';
    try {
        const savedConfig = db_1.dbOps.getGoogleConfig();
        if (savedConfig?.clientId && (!config_1.CONFIG.GOOGLE.CLIENT_ID || config_1.CONFIG.GOOGLE.CLIENT_ID.length < 5)) {
            config_1.CONFIG.GOOGLE.CLIENT_ID = savedConfig.clientId;
        }
        if (savedConfig?.clientSecret && (!config_1.CONFIG.GOOGLE.CLIENT_SECRET || config_1.CONFIG.GOOGLE.CLIENT_SECRET.length < 5)) {
            config_1.CONFIG.GOOGLE.CLIENT_SECRET = savedConfig.clientSecret;
        }
        if (!config_1.CONFIG.GOOGLE.CLIENT_ID || !config_1.CONFIG.GOOGLE.CLIENT_SECRET) {
            return res.json({
                configured: false,
                message: 'Credenciales de Google OAuth no configuradas en el servidor.',
                url: null
            });
        }
        const url = gmail_service_1.gmailService.getAuthUrl(userId);
        return res.json({ configured: true, url });
    }
    catch (err) {
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
    config_1.CONFIG.GOOGLE.CLIENT_ID = clientId.trim();
    config_1.CONFIG.GOOGLE.CLIENT_SECRET = clientSecret.trim();
    db_1.dbOps.saveGoogleConfig(clientId.trim(), clientSecret.trim());
    return res.json({
        success: true,
        message: 'Credenciales de Google OAuth guardadas exitosamente.',
        configured: true
    });
});
// Google OAuth callback
router.get('/google/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state || 'demo-user-id';
    if (!code) {
        return res.redirect(`${config_1.CONFIG.FRONTEND_URL}?auth_error=missing_code`);
    }
    try {
        const result = await gmail_service_1.gmailService.handleAuthCallback(code, state);
        return res.redirect(`${config_1.CONFIG.FRONTEND_URL}?auth_success=true&email=${encodeURIComponent(result.email)}`);
    }
    catch (err) {
        console.error('OAuth Callback error:', err);
        return res.redirect(`${config_1.CONFIG.FRONTEND_URL}?auth_error=${encodeURIComponent(err.message)}`);
    }
});
// Check Supabase connection status
router.get('/supabase/status', async (req, res) => {
    const { isSupabaseConfigured, supabaseOps } = await Promise.resolve().then(() => __importStar(require('../database/supabase')));
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
    config_1.CONFIG.SUPABASE.URL = url.trim();
    config_1.CONFIG.SUPABASE.KEY = key.trim();
    process.env.SUPABASE_URL = url.trim();
    process.env.SUPABASE_KEY = key.trim();
    const { supabaseOps } = await Promise.resolve().then(() => __importStar(require('../database/supabase')));
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
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    const user = db_1.dbOps.getUser(userId);
    const hasGoogleAuth = !!(config_1.CONFIG.GOOGLE.CLIENT_ID && config_1.CONFIG.GOOGLE.CLIENT_SECRET);
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
exports.default = router;
