import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { qrCodeService } from '../services/qrCodeService';

export class QRCodeController {
  async generateQRCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await qrCodeService.generateQRCode(req.user!.id, req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getQRCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await qrCodeService.getQRCode(req.params.codeId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async scanQRCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { qrCodeId, signature, amount, senderPhone, description } = req.body;
      const result = await qrCodeService.validateAndConsumeQRCode(
        qrCodeId,
        signature,
        amount,
        senderPhone,
        req.user?.id,
        description
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getQRHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit } = req.query;
      const result = await qrCodeService.getQRHistory(
        req.user!.id,
        Number(page) || 1,
        Number(limit) || 20
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async revokeQRCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await qrCodeService.revokeQRCode(req.user!.id, req.params.codeId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const qrCodeController = new QRCodeController();
