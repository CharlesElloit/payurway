import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from '../types';
import logger from '../utils/logger';

export function activityLogger(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') return next();

  const start = Date.now();
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    const duration = Date.now() - start;
    const authReq = req as AuthenticatedRequest;

    prisma.activityLog.create({
      data: {
        userId: authReq.user?.id || null,
        action: `${req.method} ${req.route?.path || req.path}`,
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.get('user-agent') || null,
        requestBody: sanitizeBody(req.body),
        duration,
      },
    }).catch((err) => {
      logger.warn({ error: err.message }, 'Failed to log activity');
    });

    return originalJson(body);
  };

  next();
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  const sensitiveFields = ['pin', 'password', 'passwordHash', 'otp', 'token'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***';
    }
  }
  return sanitized;
}
