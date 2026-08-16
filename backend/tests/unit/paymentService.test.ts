import { prismaMock, redisMock, resetMocks } from '../mocks/setup';
import { mockPayment, mockUser, mockNotification } from '../mocks/fixtures';
import { paymentService } from '../../src/services/paymentService';
import { carrierGatewayFactory } from '../../src/services/carrierGateway';
import { notificationService } from '../../src/services/notificationService';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../src/utils/errors';

jest.mock('../../src/services/carrierGateway');

const mockGateway = {
  requestToPay: jest.fn(),
  transfer: jest.fn(),
  checkStatus: jest.fn(),
};

beforeEach(() => {
  resetMocks();
  (carrierGatewayFactory as jest.Mock).mockReturnValue(mockGateway);
  mockGateway.requestToPay.mockReset();
  mockGateway.transfer.mockReset();
  (notificationService.createNotification as jest.Mock).mockReset();
});

describe('PaymentService', () => {
  describe('initiatePayment', () => {
    it('should create a payment record and return it', async () => {
      prismaMock.payment.create.mockResolvedValue(mockPayment as any);

      const result = await paymentService.initiatePayment({
        senderPhone: '+256771234567',
        receiverPhone: '+256759876543',
        amount: 50000,
        carrier: 'mtn',
        senderId: 'user-uuid-1',
      });

      expect(result.id).toBeDefined();
      expect(result.reference).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.amount).toBeDefined();
      expect(prismaMock.payment.create).toHaveBeenCalledTimes(1);
    });

    it('should store description if provided', async () => {
      prismaMock.payment.create.mockResolvedValue(mockPayment as any);

      await paymentService.initiatePayment({
        senderPhone: '+256771234567',
        receiverPhone: '+256759876543',
        amount: 50000,
        carrier: 'mtn',
        description: 'Electricity bill',
      });

      expect(prismaMock.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'Electricity bill' }),
        })
      );
    });

    it('should default currency to UGX', async () => {
      prismaMock.payment.create.mockResolvedValue(mockPayment as any);

      await paymentService.initiatePayment({
        senderPhone: '+256771234567',
        receiverPhone: '+256759876543',
        amount: 50000,
        carrier: 'mtn',
      });

      expect(prismaMock.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ currency: 'UGX' }),
        })
      );
    });
  });

  describe('getPayment', () => {
    it('should return payment for sender', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);

      const result = await paymentService.getPayment('user-uuid-1', 'payment-uuid-1');

      expect(result.id).toBe('payment-uuid-1');
      expect(result.amount).toBe(50000);
    });

    it('should return payment for receiver', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);

      const result = await paymentService.getPayment('user-uuid-2', 'payment-uuid-1');

      expect(result.id).toBe('payment-uuid-1');
    });

    it('should throw NotFoundError for unknown payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.getPayment('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError for unauthorized user', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);

      await expect(
        paymentService.getPayment('user-uuid-999', 'payment-uuid-1')
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getPaymentByReference', () => {
    it('should return payment by reference', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);

      const result = await paymentService.getPaymentByReference('user-uuid-1', 'PMB-TEST-ABC123');

      expect(result.reference).toBe('PMB-TEST-ABC123');
    });

    it('should throw NotFoundError for unknown reference', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.getPaymentByReference('user-uuid-1', 'UNKNOWN-REF')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPayments', () => {
    it('should return paginated payments', async () => {
      prismaMock.payment.findMany.mockResolvedValue([mockPayment] as any);
      prismaMock.payment.count.mockResolvedValue(1);

      const result = await paymentService.getPayments('user-uuid-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.payment.count.mockResolvedValue(0);

      await paymentService.getPayments('user-uuid-1', 1, 20, 'completed');

      expect(prismaMock.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'completed' }),
        })
      );
    });

    it('should return empty results for user with no payments', async () => {
      prismaMock.payment.findMany.mockResolvedValue([]);
      prismaMock.payment.count.mockResolvedValue(0);

      const result = await paymentService.getPayments('user-uuid-1');

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('cancelPayment', () => {
    it('should cancel a pending payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);
      prismaMock.payment.update.mockResolvedValue({ ...mockPayment, status: 'cancelled' } as any);

      const result = await paymentService.cancelPayment('user-uuid-1', 'payment-uuid-1');

      expect(result.message).toBe('Payment cancelled');
    });

    it('should throw ForbiddenError if not the sender', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);

      await expect(
        paymentService.cancelPayment('user-uuid-2', 'payment-uuid-1')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError for completed payment', async () => {
      const completedPayment = { ...mockPayment, status: 'completed' as const };
      prismaMock.payment.findUnique.mockResolvedValue(completedPayment as any);

      await expect(
        paymentService.cancelPayment('user-uuid-1', 'payment-uuid-1')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError for unknown payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.cancelPayment('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('handleWebhook', () => {
    it('should update payment status to completed on success', async () => {
      const processingPayment = { ...mockPayment, status: 'processing' as const };
      prismaMock.payment.findFirst.mockResolvedValue(processingPayment as any);
      prismaMock.payment.update.mockResolvedValue(processingPayment as any);
      prismaMock.payment.findUnique.mockResolvedValue({ ...processingPayment, status: 'completed' } as any);

      await paymentService.handleWebhook('mtn', 'carrier-tx-123', 'completed', { status: 'SUCCESSFUL' });

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed' }),
        })
      );
    });

    it('should update payment status to failed', async () => {
      const processingPayment = { ...mockPayment, status: 'processing' as const };
      prismaMock.payment.findFirst.mockResolvedValue(processingPayment as any);
      prismaMock.payment.update.mockResolvedValue(processingPayment as any);
      prismaMock.payment.findUnique.mockResolvedValue({ ...processingPayment, status: 'failed' } as any);

      await paymentService.handleWebhook('mtn', 'carrier-tx-123', 'failed', { reason: 'Insufficient funds' });

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            failureReason: 'Insufficient funds',
          }),
        })
      );
    });

    it('should ignore webhook for already completed payment', async () => {
      const completedPayment = { ...mockPayment, status: 'completed' as const };
      prismaMock.payment.findFirst.mockResolvedValue(completedPayment as any);

      await paymentService.handleWebhook('mtn', 'carrier-tx-123', 'completed');

      expect(prismaMock.payment.update).not.toHaveBeenCalled();
    });

    it('should handle unknown payment gracefully', async () => {
      prismaMock.payment.findFirst.mockResolvedValue(null);

      await expect(
        paymentService.handleWebhook('mtn', 'unknown-tx', 'completed')
      ).resolves.not.toThrow();
    });

    it('should set failureReason from carrier response', async () => {
      const pendingPayment = { ...mockPayment, status: 'pending' as const };
      prismaMock.payment.findFirst.mockResolvedValue(pendingPayment as any);
      prismaMock.payment.update.mockResolvedValue(pendingPayment as any);
      prismaMock.payment.findUnique.mockResolvedValue({ ...pendingPayment, status: 'failed' } as any);

      await paymentService.handleWebhook('airtel', 'tx-456', 'failed', { reason: 'Timeout' });

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            failureReason: 'Timeout',
          }),
        })
      );
    });
  });

  describe('requestPayment', () => {
    it('should create a payment request notification', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      (notificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      const result = await paymentService.requestPayment({
        requesterId: 'user-uuid-1',
        targetPhone: '+256759876543',
        amount: 50000,
        carrier: 'mtn',
      });

      expect(result.reference).toBeDefined();
      expect(result.amount).toBe(50000);
      expect(result.targetPhone).toBe('+256759876543');
      expect(notificationService.createNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundError if requester not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.requestPayment({
          requesterId: 'unknown',
          targetPhone: '+256759876543',
          amount: 50000,
          carrier: 'mtn',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('processPaymentAsync', () => {
    it('should call carrier gateway and update status', async () => {
      const pendingPayment = { ...mockPayment, status: 'pending' as const };
      prismaMock.payment.findUnique.mockResolvedValue(pendingPayment as any);
      prismaMock.payment.update.mockResolvedValue(pendingPayment as any);
      mockGateway.requestToPay.mockResolvedValue({
        transactionId: 'carrier-tx-123',
        status: 'completed',
      });
      prismaMock.payment.findUnique
        .mockResolvedValueOnce(pendingPayment as any)
        .mockResolvedValueOnce({ ...pendingPayment, status: 'completed' } as any);

      await paymentService.processPaymentAsync('payment-uuid-1');

      expect(mockGateway.requestToPay).toHaveBeenCalled();
      expect(prismaMock.payment.update).toHaveBeenCalled();
    });

    it('should handle gateway errors gracefully', async () => {
      const pendingPayment = { ...mockPayment, status: 'pending' as const };
      prismaMock.payment.findUnique.mockResolvedValue(pendingPayment as any);
      prismaMock.payment.update.mockResolvedValue(pendingPayment as any);
      mockGateway.requestToPay.mockRejectedValue(new Error('Network error'));

      await paymentService.processPaymentAsync('payment-uuid-1');

      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'failed' }),
        })
      );
    });

    it('should do nothing if payment not found', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);

      await paymentService.processPaymentAsync('nonexistent');

      expect(prismaMock.payment.update).not.toHaveBeenCalled();
    });
  });
});
