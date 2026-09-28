import { Request, Response, NextFunction } from 'express';
import { dbOps } from '../database/db';

export function require2FA(req: Request, res: Response, next: NextFunction) {
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isAndroidClient =
    req.headers['x-client-platform'] === 'gastabien-android' ||
    req.headers['x-requested-with'] === 'com.gastabien.app' ||
    userAgent.includes('okhttp') ||
    userAgent.includes('dalvik');

  // Allow native mobile app requests
  if (isAndroidClient) {
    return next();
  }

  const twoFactor = dbOps.getTwoFactorAuth();

  // If 2FA is not yet configured, block protected data access on web until setup is completed
  if (!twoFactor || !twoFactor.enabled) {
    return res.status(401).json({
      error: '2FA_REQUIRED',
      message: 'Debes configurar la autenticación de 2 factores (2FA) para acceder.'
    });
  }

  // Extract token from Authorization header or custom header or query
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-device-token']) {
    token = (req.headers['x-device-token'] as string).trim();
  } else if (req.query.device_token) {
    token = (req.query.device_token as string).trim();
  }

  if (token && dbOps.validateDeviceSession(token)) {
    return next();
  }

  return res.status(401).json({
    error: '2FA_REQUIRED',
    message: 'Se requiere autenticación de 2 factores para acceder a GastaBien.'
  });
}
