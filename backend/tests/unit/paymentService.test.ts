import { prismaMock, redisMock, resetMocks } from '../mocks/setup';
import { mockPayment, mockUser, mockNotification } from '../mocks/fixtures';
import { paymentService } from '../../src/services/paymentService';
import { carrierGatewayFactory } from '../../src/services/carrierGateway';
import { notificationService } from '../../src/services/notificationService';
import { accountService } from '../../src/services/accountService';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../src/utils/errors';

jest.mock('../../src/services/carrierGateway');
jest.mock('../../src/services/accountService', () => ({
  __esModule: true,
  accountService: {
    refreshBalance: jest.fn(),
    updateAccountBalance: jest.fn(),
    getBalance: jest.fn(),
    refreshLinkedBalance: jest.fn(),
    getDecryptedPin: jest.fn(),
    getAccountByPhone: jest.fn(),
  },
}));

jest.mock('../../src/utils/encryption', () => ({
  encryptPin: jest.fn((pin: string) => `encrypted:${pin}`),
  decryptPin: jest.fn((encrypted: string) => encrypted.replace('encrypted:', '')),
}));

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
  (accountService.refreshBalance as jest.Mock).mockReset();
  (accountService.updateAccountBalance as jest.Mock).mockReset();
  (accountService.getDecryptedPin as jest.Mock).mockReset();
  (accountService.getAccountByPhone as jest.Mock).mockReset();
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
    it('should create a payment request and notify the target', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce({ ...mockUser, id: 'user-uuid-2', phone: '+256759876543' } as any);
      prismaMock.payment.create.mockResolvedValue({
        ...mockPayment,
        status: 'requested',
        senderId: 'user-uuid-2',
        senderPhone: '+256759876543',
        receiverId: 'user-uuid-1',
        receiverPhone: '+256771234567',
      } as any);
      (notificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      const result = await paymentService.requestPayment({
        requesterId: 'user-uuid-1',
        targetPhone: '+256759876543',
        amount: 50000,
        carrier: 'mtn',
      });

      expect(result.reference).toBeDefined();
      expect(result.amount).toBe(50000);
      expect(result.status).toBe('requested');
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

    it('should throw NotFoundError if target user not found', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(null);

      await expect(
        paymentService.requestPayment({
          requesterId: 'user-uuid-1',
          targetPhone: '+256799999999',
          amount: 50000,
          carrier: 'mtn',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('respondToRequest', () => {
    const requestedPayment = {
      ...mockPayment,
      status: 'requested' as const,
      senderId: 'user-uuid-1',
      senderPhone: '+256771234567',
      receiverId: 'user-uuid-2',
      receiverPhone: '+256759876543',
    };

    it('should accept a payment request and start processing', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(requestedPayment as any);
      prismaMock.payment.update.mockResolvedValue({ ...requestedPayment, status: 'pending' } as any);
      (notificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      const result = await paymentService.respondToRequest('user-uuid-1', 'payment-uuid-1', 'accept');

      expect(result.message).toContain('accepted');
      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'pending' }),
        })
      );
    });

    it('should reject a payment request', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(requestedPayment as any);
      prismaMock.payment.update.mockResolvedValue({ ...requestedPayment, status: 'cancelled' } as any);
      (notificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      const result = await paymentService.respondToRequest('user-uuid-1', 'payment-uuid-1', 'reject');

      expect(result.message).toContain('rejected');
      expect(prismaMock.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'cancelled' }),
        })
      );
    });

    it('should throw ForbiddenError if not the payer', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(requestedPayment as any);

      await expect(
        paymentService.respondToRequest('user-uuid-999', 'payment-uuid-1', 'accept')
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw BadRequestError for non-requested status', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);

      await expect(
        paymentService.respondToRequest('user-uuid-1', 'payment-uuid-1', 'accept')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError for unknown payment', async () => {
      prismaMock.payment.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.respondToRequest('user-uuid-1', 'unknown-id', 'accept')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('processPaymentAsync', () => {
    it('should call carrier gateway and update status', async () => {
      const pendingPayment = { ...mockPayment, status: 'pending' as const };
      prismaMock.payment.findUnique.mockResolvedValue(pendingPayment as any);
      prismaMock.payment.update.mockResolvedValue(pendingPayment as any);
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null as any);
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

    it('should pass decrypted PIN to gateway when sender has stored PIN', async () => {
      const pendingPayment = { ...mockPayment, status: 'pending' as const, senderId: 'user-uuid-1' };
      prismaMock.payment.findUnique.mockResolvedValue(pendingPayment as any);
      prismaMock.payment.update.mockResolvedValue(pendingPayment as any);
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue({
        encryptedPin: 'encrypted:1234',
      } as any);
      (accountService.getDecryptedPin as jest.Mock).mockResolvedValue('1234');
      mockGateway.requestToPay.mockResolvedValue({
        transactionId: 'carrier-tx-123',
        status: 'completed',
      });
      prismaMock.payment.findUnique
        .mockResolvedValueOnce(pendingPayment as any)
        .mockResolvedValueOnce({ ...pendingPayment, status: 'completed' } as any);

      await paymentService.processPaymentAsync('payment-uuid-1');

      expect(mockGateway.requestToPay).toHaveBeenCalledWith(
        expect.objectContaining({ pin: '1234' })
      );
    });

    it('should handle gateway errors gracefully', async () => {
      const pendingPayment = { ...mockPayment, status: 'pending' as const };
      prismaMock.payment.findUnique.mockResolvedValue(pendingPayment as any);
      prismaMock.payment.update.mockResolvedValue(pendingPayment as any);
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null as any);
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

  describe('balance updates on payment completion', () => {
    it('should attempt to refresh receiver balance after payment completes', async () => {
      const processingPayment = {
        ...mockPayment,
        status: 'processing' as const,
        senderId: 'user-uuid-1',
        receiverId: 'user-uuid-2',
        receiverPhone: '+256759876543',
        senderPhone: '+256771234567',
      };
      const completedPayment = { ...processingPayment, status: 'completed' as const };
      prismaMock.payment.findFirst.mockResolvedValue(processingPayment as any);
      prismaMock.payment.update.mockResolvedValue(processingPayment as any);
      prismaMock.payment.findUnique.mockResolvedValue(completedPayment as any);
      (notificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);

      await paymentService.handleWebhook('mtn', 'carrier-tx-123', 'completed', { status: 'SUCCESSFUL' });

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should fall back to local balance adjustment when carrier refresh fails', async () => {
      const processingPayment = {
        ...mockPayment,
        status: 'processing' as const,
        senderId: 'user-uuid-1',
        receiverId: 'user-uuid-2',
        receiverPhone: '+256759876543',
        senderPhone: '+256771234567',
      };
      const completedPayment = { ...processingPayment, status: 'completed' as const };
      prismaMock.payment.findFirst.mockResolvedValue(processingPayment as any);
      prismaMock.payment.update.mockResolvedValue(processingPayment as any);
      prismaMock.payment.findUnique.mockResolvedValue(completedPayment as any);
      (notificationService.createNotification as jest.Mock).mockResolvedValue(mockNotification);
      (accountService.refreshBalance as jest.Mock).mockRejectedValue(new Error('carrier down'));
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue({ id: 'acct-1', balance: 50000, userId: 'user-uuid-2', phoneNumber: '+256759876543', isActive: true, verificationStatus: 'verified' } as any);

      await paymentService.handleWebhook('mtn', 'carrier-tx-123', 'completed', { status: 'SUCCESSFUL' });

      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
    });
  });
});
