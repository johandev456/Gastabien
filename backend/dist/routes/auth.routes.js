"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gmail_service_1 = require("../services/gmail.service");
const db_1 = require("../database/db");
const config_1 = require("../config");
const totp_service_1 = require("../services/totp.service");
const router = (0, express_1.Router)();
// In-memory holder for pending 2FA setup until verified
let pendingSetup = null;
// ==========================================
// 2FA TWO-FACTOR AUTHENTICATION ENDPOINTS
// ==========================================
// Get 2FA Status & Device Session validity
router.get('/2fa/status', (req, res) => {
    const twoFactor = db_1.dbOps.getTwoFactorAuth();
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    }
    else if (req.headers['x-device-token']) {
        token = req.headers['x-device-token'].trim();
    }
    else if (req.query.token) {
        token = req.query.token.trim();
    }
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
        const authHeader = req.headers.authorization;
        let token;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
        }
        else if (req.headers['x-device-token']) {
            token = req.headers['x-device-token'].trim();
        }
        if (existing && existing.enabled) {
            // If already enabled, only an already authenticated device can request setup/reconfiguration
            if (!token || !db_1.dbOps.validateDeviceSession(token)) {
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
    const cleanCode = code.trim().replace(/\s+/g, '');
    const existing2FA = db_1.dbOps.getTwoFactorAuth();
    // If in setup mode
    if (isSetup || !existing2FA || !existing2FA.enabled) {
        const secretToVerify = pendingSetup?.secret || req.body.secret;
        if (!secretToVerify) {
            return res.status(400).json({ success: false, error: 'No hay configuración 2FA pendiente. Inicia el setup primero.' });
        }
        const isValid = totp_service_1.totpService.verifyToken(secretToVerify, cleanCode, 2);
        if (!isValid) {
            return res.status(400).json({ success: false, error: 'Código 2FA incorrecto. Verifica el reloj de tu dispositivo o reintenta.' });
        }
        // Save and activate 2FA permanently
        const backupCodes = pendingSetup?.backupCodes || totp_service_1.totpService.generateBackupCodes(8);
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
        isValid = totp_service_1.totpService.verifyToken(existing2FA.secret, cleanCode, 2);
    }
    // Check if it's a backup code (e.g. XXXX-XXXX)
    if (!isValid && cleanCode.length >= 8) {
        const backupValid = db_1.dbOps.verifyAndConsumeBackupCode(cleanCode);
        if (backupValid) {
            isValid = true;
        }
    }
    if (!isValid) {
        return res.status(400).json({ success: false, error: 'Código 2FA inválido o expirado. Revisa tu aplicación de autenticación.' });
    }
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
// Logout / Revoke device session
router.post('/2fa/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    }
    else if (req.headers['x-device-token']) {
        token = req.headers['x-device-token'].trim();
    }
    else if (req.body.token) {
        token = req.body.token;
    }
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
// Check current user / Gmail connection status
router.get('/status', (req, res) => {
    const userId = req.headers['x-user-id'] || req.query.userId || 'demo-user-id';
    const user = db_1.dbOps.getUser(userId);
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
exports.default = router;
