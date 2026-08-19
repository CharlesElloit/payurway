import { Request, Response, NextFunction } from 'express';
import * as Sentry from '@sentry/node';
import { AppError, InternalError } from '../utils/errors';
import logger from '../utils/logger';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  Sentry.withScope((scope) => {
    scope.setTag('url', req.originalUrl);
    scope.setTag('method', req.method);
    scope.setUser({ ip: req.ip });
    scope.setExtra('body', req.body);
    scope.setExtra('query', req.query);
    scope.setExtra('params', req.params);
    Sentry.captureException(err);
  });

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err }, 'Non-operational error');
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.statusCode,
      },
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  const internalError = new InternalError();
  res.status(internalError.statusCode).json({
    success: false,
    error: {
      message: internalError.message,
      code: internalError.statusCode,
    },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 404,
    },
  });
}
