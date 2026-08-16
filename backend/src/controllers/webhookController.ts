import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import { Carrier, PaymentStatus } from '../types';
import logger from '../utils/logger';

export class WebhookController {
  async handleMTNWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { financialTransactionId, status, reason } = req.body;

      const statusMap: Record<string, PaymentStatus> = {
        SUCCESSFUL: 'completed',
        FAILED: 'failed',
        REJECTED: 'failed',
        TIMEOUT: 'failed',
        PENDING: 'processing',
      };

      const mappedStatus = statusMap[status] || 'pending';

      await paymentService.handleWebhook(
        'mtn',
        financialTransactionId,
        mappedStatus,
        req.body
      );

      res.json({ status: 'received' });
    } catch (error) {
      logger.error({ error, body: req.body }, 'MTN webhook processing error');
      res.status(200).json({ status: 'error' });
    }
  }

  async handleAirtelWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { transaction, status } = req.body;

      const transactionId = transaction?.id || req.body.externalTransactionID;
      const statusValue = status?.status_code || req.body.status;

      const statusMap: Record<string | number, PaymentStatus> = {
        TS: 'completed',
        TF: 'failed',
        TA: 'completed',
        BT: 'completed',
        200: 'completed',
        0: 'completed',
        'success': 'completed',
        'failed': 'failed',
      };

      const mappedStatus = statusMap[statusValue] || 'processing';

      await paymentService.handleWebhook(
        'airtel',
        transactionId,
        mappedStatus,
        req.body
      );

      res.json({ status: 'received' });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Airtel webhook processing error');
      res.status(200).json({ status: 'error' });
    }
  }

  async handleStatusCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { transactionId, carrier, status } = req.body;

      if (!transactionId || !carrier || !status) {
        res.status(400).json({ status: 'missing fields' });
        return;
      }

      await paymentService.handleWebhook(
        carrier as Carrier,
        transactionId,
        status as PaymentStatus,
        req.body
      );

      res.json({ status: 'received' });
    } catch (error) {
      next(error);
    }
  }
}

export const webhookController = new WebhookController();
