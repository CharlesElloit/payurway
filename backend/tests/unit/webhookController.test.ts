import { Request, Response } from 'express';
import { webhookController } from '../../src/controllers/webhookController';
import { paymentService } from '../../src/services/paymentService';

jest.mock('../../src/services/paymentService');

const mockReq = (body: any): Request => ({ body } as Request);
const mockRes = (): Response => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};
const mockNext = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (paymentService.handleWebhook as jest.Mock).mockResolvedValue(undefined);
});

describe('WebhookController', () => {
  describe('handleMTNWebhook', () => {
    it('should process successful MTN webhook', async () => {
      const req = mockReq({
        financialTransactionId: 'mtn-tx-123',
        status: 'SUCCESSFUL',
        amount: '50000',
      });
      const res = mockRes();

      await webhookController.handleMTNWebhook(req, res, mockNext);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        'mtn',
        'mtn-tx-123',
        'completed',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({ status: 'received' });
    });

    it('should process failed MTN webhook', async () => {
      const req = mockReq({
        financialTransactionId: 'mtn-tx-456',
        status: 'FAILED',
        reason: 'Insufficient funds',
      });
      const res = mockRes();

      await webhookController.handleMTNWebhook(req, res, mockNext);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        'mtn',
        'mtn-tx-456',
        'failed',
        expect.any(Object)
      );
    });

    it('should handle processing status', async () => {
      const req = mockReq({
        financialTransactionId: 'mtn-tx-789',
        status: 'PENDING',
      });
      const res = mockRes();

      await webhookController.handleMTNWebhook(req, res, mockNext);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        'mtn',
        'mtn-tx-789',
        'processing',
        expect.any(Object)
      );
    });
  });

  describe('handleAirtelWebhook', () => {
    it('should process successful Airtel webhook', async () => {
      const req = mockReq({
        transaction: { id: 'airtel-tx-123' },
        status: { status_code: 200 },
      });
      const res = mockRes();

      await webhookController.handleAirtelWebhook(req, res, mockNext);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        'airtel',
        'airtel-tx-123',
        'completed',
        expect.any(Object)
      );
      expect(res.json).toHaveBeenCalledWith({ status: 'received' });
    });

    it('should process failed Airtel webhook', async () => {
      const req = mockReq({
        externalTransactionID: 'airtel-tx-456',
        status: 'failed',
      });
      const res = mockRes();

      await webhookController.handleAirtelWebhook(req, res, mockNext);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        'airtel',
        'airtel-tx-456',
        'failed',
        expect.any(Object)
      );
    });
  });

  describe('handleStatusCallback', () => {
    it('should process status callback', async () => {
      const req = mockReq({
        transactionId: 'tx-123',
        carrier: 'mtn',
        status: 'completed',
      });
      const res = mockRes();

      await webhookController.handleStatusCallback(req, res, mockNext);

      expect(paymentService.handleWebhook).toHaveBeenCalledWith(
        'mtn',
        'tx-123',
        'completed',
        expect.any(Object)
      );
    });

    it('should return 400 for missing fields', async () => {
      const req = mockReq({ transactionId: 'tx-123' });
      const res = mockRes();

      await webhookController.handleStatusCallback(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
