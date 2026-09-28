"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.require2FA = require2FA;
const db_1 = require("../database/db");
function require2FA(req, res, next) {
    // Check Android/local development bypass header if present
    if (req.headers['x-client-platform'] === 'gastabien-android') {
        return next();
    }
    const twoFactor = db_1.dbOps.getTwoFactorAuth();
    // If 2FA is not yet configured, block protected data access until setup is completed
    if (!twoFactor || !twoFactor.enabled) {
        return res.status(401).json({
            error: '2FA_REQUIRED',
            message: 'Debes configurar la autenticación de 2 factores (2FA) para acceder.'
        });
    }
    // Extract token from Authorization header or custom header or query
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
    }
    else if (req.headers['x-device-token']) {
        token = req.headers['x-device-token'].trim();
    }
    else if (req.query.device_token) {
        token = req.query.device_token.trim();
    }
    // Check Android/local development bypass header if present
    if (req.headers['x-client-platform'] === 'gastabien-android') {
        return next();
    }
    if (token && db_1.dbOps.validateDeviceSession(token)) {
        return next();
    }
    return res.status(401).json({
        error: '2FA_REQUIRED',
        message: 'Se requiere autenticación de 2 factores para acceder a GastaBien.'
    });
}
