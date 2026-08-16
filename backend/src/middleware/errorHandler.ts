import { Request, Response, NextFunction } from 'express';
import { AppError, InternalError } from '../utils/errors';
import logger from '../utils/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
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
