import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, Carrier } from '../types';
import { paymentService } from '../services/paymentService';

export class PaymentController {
  async initiatePayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.initiatePayment({
        senderId: req.user?.id,
        senderPhone: req.body.senderPhone,
        receiverId: req.body.receiverId,
        receiverPhone: req.body.receiverPhone,
        amount: req.body.amount,
        carrier: req.body.carrier,
        description: req.body.description,
        currency: req.body.currency,
        qrCodeId: req.body.qrCodeId,
        pin: req.body.pin,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getPayment(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentByReference(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.getPaymentByReference(req.user!.id, req.params.reference);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, status } = req.query;
      const result = await paymentService.getPayments(
        req.user!.id,
        Number(page) || 1,
        Number(limit) || 20,
        status as any
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async cancelPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.cancelPayment(req.user!.id, req.params.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async requestPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.requestPayment({
        requesterId: req.user!.id,
        targetPhone: req.body.targetPhone,
        amount: req.body.amount,
        carrier: req.body.carrier,
        description: req.body.description,
      });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async respondToRequest(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await paymentService.respondToRequest(
        req.user!.id,
        req.params.id,
        req.body.action,
        req.body.pin
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentRequests(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const result = await paymentService.getPaymentRequests(
        req.user!.id,
        Number(page) || 1,
        Number(limit) || 20
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const paymentController = new PaymentController();
