import { prismaMock, redisMock, resetMocks } from '../mocks/setup';
import { mockQRCode, mockUser } from '../mocks/fixtures';
import { qrCodeService } from '../../src/services/qrCodeService';
import { BadRequestError, NotFoundError } from '../../src/utils/errors';
import { signQRCodeData } from '../../src/utils/helpers';

beforeEach(() => {
  resetMocks();
});

jest.mock('qrcode', () => ({
  __esModule: true,
  default: {
    toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,mockQRImage'),
  },
}));

jest.mock('../../src/services/paymentService', () => ({
  paymentService: {
    initiatePayment: jest.fn().mockResolvedValue({
      id: 'payment-new-1',
      reference: 'PMB-NEW-001',
      amount: 25000,
      currency: 'UGX',
      status: 'pending',
      carrier: 'mtn',
      createdAt: new Date(),
    }),
  },
}));

describe('QRCodeService', () => {
  describe('generateQRCode', () => {
    it('should generate a QR code for a verified MTN account', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue({
        id: 'account-uuid-1',
        phoneNumber: '+256771234567',
        carrier: 'mtn',
      } as any);
      prismaMock.qRCode.create.mockResolvedValue(mockQRCode as any);

      const result = await qrCodeService.generateQRCode('user-uuid-1', {
        carrier: 'mtn',
      });

      expect(result.id).toBeDefined();
      expect(result.qrImage).toBeDefined();
      expect(result.qrData.carrier).toBe('mtn');
      expect(result.qrData).not.toHaveProperty('amount');
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should throw NotFoundError if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        qrCodeService.generateQRCode('unknown-user', { carrier: 'mtn' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError if no verified account', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null);

      await expect(
        qrCodeService.generateQRCode('user-uuid-1', { carrier: 'mtn' })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getQRCode', () => {
    it('should return cached QR code data', async () => {
      const cachedData = {
        id: 'qr-uuid-1',
        receiverId: 'user-uuid-1',
        receiverName: 'John Doe',
        receiverPhone: '+256771234567',
        carrier: 'mtn',
        currency: 'UGX',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };
      redisMock.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await qrCodeService.getQRCode('qr-uuid-1');

      expect(result.id).toBe('qr-uuid-1');
      expect(result).not.toHaveProperty('amount');
      expect(prismaMock.qRCode.findUnique).not.toHaveBeenCalled();
    });

    it('should fetch from database if not cached', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.qRCode.findUnique.mockResolvedValue({ ...mockQRCode, amount: null } as any);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await qrCodeService.getQRCode('qr-uuid-1');

      expect(result.id).toBe('qr-uuid-1');
      expect(result.receiverName).toBe('John Doe');
      expect(result).not.toHaveProperty('amount');
    });

    it('should throw NotFoundError for unknown QR code', async () => {
      redisMock.get.mockResolvedValue(null);
      prismaMock.qRCode.findUnique.mockResolvedValue(null);

      await expect(qrCodeService.getQRCode('unknown-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError for expired QR code', async () => {
      redisMock.get.mockResolvedValue(null);
      const expiredQR = { ...mockQRCode, amount: null, expiresAt: new Date(Date.now() - 1000) };
      prismaMock.qRCode.findUnique.mockResolvedValue(expiredQR as any);

      await expect(qrCodeService.getQRCode('qr-uuid-1')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for used one-time QR code', async () => {
      redisMock.get.mockResolvedValue(null);
      const usedQR = { ...mockQRCode, amount: null, isOneTime: true, isUsed: true };
      prismaMock.qRCode.findUnique.mockResolvedValue(usedQR as any);

      await expect(qrCodeService.getQRCode('qr-uuid-1')).rejects.toThrow(BadRequestError);
    });

    it('should throw NotFoundError for deactivated QR code', async () => {
      redisMock.get.mockResolvedValue(null);
      const inactiveQR = { ...mockQRCode, amount: null, isActive: false };
      prismaMock.qRCode.findUnique.mockResolvedValue(inactiveQR as any);

      await expect(qrCodeService.getQRCode('qr-uuid-1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('validateAndConsumeQRCode', () => {
    it('should validate, consume, and initiate payment', async () => {
      const { signQRCodeData } = require('../../src/utils/helpers');
      const expiresAt = new Date(Date.now() + 600000);
      const payloadForSig = {
        id: 'qr-uuid-1',
        userId: 'user-uuid-1',
        phone: '+256771234567',
        carrier: 'mtn',
        expiresAt: expiresAt.toISOString(),
      };

      const signature = signQRCodeData(JSON.stringify(payloadForSig));

      redisMock.get.mockResolvedValue(JSON.stringify({ ...payloadForSig, receiverId: 'user-uuid-1', receiverPhone: '+256771234567', receiverName: 'John Doe', currency: 'UGX', createdAt: new Date().toISOString() }));
      redisMock.del.mockResolvedValue(1);

      const freshQR = { ...mockQRCode, amount: null, isOneTime: true, isUsed: false };
      prismaMock.qRCode.findUnique.mockResolvedValue(freshQR as any);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.qRCode.update.mockResolvedValue({ ...freshQR, isUsed: true } as any);

      const result = await qrCodeService.validateAndConsumeQRCode(
        'qr-uuid-1',
        signature,
        25000,
        '+256799999999',
        'user-uuid-3',
        'Lunch money'
      );

      expect(result.qrData.id).toBe('qr-uuid-1');
      expect(result.payment).toBeDefined();
      expect(result.payment.amount).toBe(25000);
      expect(prismaMock.qRCode.update).toHaveBeenCalled();
    });

    it('should throw BadRequestError for invalid signature', async () => {
      const cachedData = {
        id: 'qr-uuid-1',
        receiverId: 'user-uuid-1',
        receiverPhone: '+256771234567',
        carrier: 'mtn',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
        receiverName: 'John Doe',
        currency: 'UGX',
        createdAt: new Date().toISOString(),
      };
      redisMock.get.mockResolvedValue(JSON.stringify(cachedData));

      await expect(
        qrCodeService.validateAndConsumeQRCode('qr-uuid-1', 'invalid-signature', 25000, '+256799999999')
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getQRHistory', () => {
    it('should return paginated QR history', async () => {
      prismaMock.qRCode.findMany.mockResolvedValue([mockQRCode] as any);
      prismaMock.qRCode.count.mockResolvedValue(1);

      const result = await qrCodeService.getQRHistory('user-uuid-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should return empty list for user with no QR codes', async () => {
      prismaMock.qRCode.findMany.mockResolvedValue([]);
      prismaMock.qRCode.count.mockResolvedValue(0);

      const result = await qrCodeService.getQRHistory('user-uuid-1');

      expect(result.data).toHaveLength(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('revokeQRCode', () => {
    it('should revoke a QR code', async () => {
      prismaMock.qRCode.findFirst.mockResolvedValue(mockQRCode as any);
      prismaMock.qRCode.update.mockResolvedValue({ ...mockQRCode, isActive: false } as any);
      redisMock.del.mockResolvedValue(1);

      const result = await qrCodeService.revokeQRCode('user-uuid-1', 'qr-uuid-1');

      expect(result.message).toBe('QR code revoked successfully');
    });

    it('should throw NotFoundError if QR code not found', async () => {
      prismaMock.qRCode.findFirst.mockResolvedValue(null);

      await expect(
        qrCodeService.revokeQRCode('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });
  });
});
