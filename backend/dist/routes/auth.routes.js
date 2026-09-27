"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gmail_service_1 = require("../services/gmail.service");
const db_1 = require("../database/db");
const config_1 = require("../config");
const router = (0, express_1.Router)();
// Get Google OAuth URL
router.get('/google/url', (req, res) => {
    const userId = req.query.userId || 'demo-user-id';
    try {
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
