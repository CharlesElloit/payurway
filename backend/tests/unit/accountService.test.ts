import { prismaMock, redisMock, resetMocks } from '../mocks/setup';
import { mockAccount, mockPendingAccount, mockUser } from '../mocks/fixtures';
import { accountService } from '../../src/services/accountService';
import { BadRequestError, NotFoundError, ConflictError } from '../../src/utils/errors';

beforeEach(() => {
  resetMocks();
});

describe('AccountService', () => {
  describe('linkAccount', () => {
    it('should link an MTN account successfully', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      prismaMock.mobileMoneyAccount.create.mockResolvedValue(mockPendingAccount as any);

      const result = await accountService.linkAccount('user-uuid-1', '+256771234567', 'mtn');

      expect(result.id).toBeDefined();
      expect(result.carrier).toBe('mtn');
      expect(result.verificationStatus).toBe('pending');
      expect(result.phoneNumber).toBe('+256771234567');
      expect(redisMock.setex).toHaveBeenCalled();
    });

    it('should auto-detect MTN carrier from phone number', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      prismaMock.mobileMoneyAccount.create.mockResolvedValue(mockPendingAccount as any);

      const result = await accountService.linkAccount('user-uuid-1', '0771234567');

      expect(result.carrier).toBe('mtn');
    });

    it('should auto-detect Airtel carrier from phone number', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      prismaMock.mobileMoneyAccount.create.mockResolvedValue({
        ...mockPendingAccount,
        carrier: 'airtel',
      } as any);

      const result = await accountService.linkAccount('user-uuid-1', '0759876543');

      expect(result.carrier).toBe('airtel');
    });

    it('should throw BadRequestError if carrier cannot be detected', async () => {
      await expect(
        accountService.linkAccount('user-uuid-1', '12345')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ConflictError if phone already linked', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(mockAccount as any);

      await expect(
        accountService.linkAccount('user-uuid-1', '+256771234567', 'mtn')
      ).rejects.toThrow(ConflictError);
    });

    it('should normalize phone number with country code', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      prismaMock.mobileMoneyAccount.create.mockResolvedValue(mockPendingAccount as any);

      await accountService.linkAccount('user-uuid-1', '0771234567', 'mtn');

      expect(prismaMock.mobileMoneyAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phoneNumber: '256771234567',
          }),
        })
      );
    });
  });

  describe('verifyAccount', () => {
    it('should verify account with correct OTP', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockPendingAccount as any);
      redisMock.get.mockResolvedValue(JSON.stringify({ token: '123456' }));
      redisMock.del.mockResolvedValue(1);
      prismaMock.mobileMoneyAccount.update.mockResolvedValue({
        ...mockPendingAccount,
        verificationStatus: 'verified',
        verifiedAt: new Date(),
      } as any);

      const result = await accountService.verifyAccount('user-uuid-1', 'account-uuid-2', '123456');

      expect(result.verificationStatus).toBe('verified');
      expect(result.message).toBe('Account verified successfully');
    });

    it('should return success if already verified', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockAccount as any);

      const result = await accountService.verifyAccount('user-uuid-1', 'account-uuid-1', '123456');

      expect(result.status).toBe('verified');
      expect(result.message).toBe('Account already verified');
    });

    it('should throw NotFoundError if account not found', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null);

      await expect(
        accountService.verifyAccount('user-uuid-1', 'nonexistent', '123456')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw BadRequestError for expired verification', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockPendingAccount as any);
      redisMock.get.mockResolvedValue(null);

      await expect(
        accountService.verifyAccount('user-uuid-1', 'account-uuid-2', '123456')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError for wrong OTP', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockPendingAccount as any);
      redisMock.get.mockResolvedValue(JSON.stringify({ token: '123456' }));

      await expect(
        accountService.verifyAccount('user-uuid-1', 'account-uuid-2', '000000')
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('getAccounts', () => {
    it('should return user accounts', async () => {
      prismaMock.mobileMoneyAccount.findMany.mockResolvedValue([mockAccount] as any);

      const result = await accountService.getAccounts('user-uuid-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('account-uuid-1');
    });

    it('should return empty array if no accounts', async () => {
      prismaMock.mobileMoneyAccount.findMany.mockResolvedValue([]);

      const result = await accountService.getAccounts('user-uuid-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getAccount', () => {
    it('should return a specific account', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockAccount as any);

      const result = await accountService.getAccount('user-uuid-1', 'account-uuid-1');

      expect(result.id).toBe('account-uuid-1');
    });

    it('should throw NotFoundError for unknown account', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null);

      await expect(
        accountService.getAccount('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('removeAccount', () => {
    it('should soft-delete an account', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockAccount as any);
      prismaMock.mobileMoneyAccount.update.mockResolvedValue({ ...mockAccount, isActive: false } as any);

      const result = await accountService.removeAccount('user-uuid-1', 'account-uuid-1');

      expect(result.message).toBe('Account removed successfully');
      expect(prismaMock.mobileMoneyAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });

    it('should reassign default when removing default account', async () => {
      const anotherAccount = { ...mockAccount, id: 'account-uuid-3', isDefault: false };
      prismaMock.mobileMoneyAccount.findFirst
        .mockResolvedValueOnce(mockAccount as any)
        .mockResolvedValueOnce(anotherAccount as any);
      prismaMock.mobileMoneyAccount.update.mockResolvedValue({} as any);

      await accountService.removeAccount('user-uuid-1', 'account-uuid-1');

      expect(prismaMock.mobileMoneyAccount.update).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundError for unknown account', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null);

      await expect(
        accountService.removeAccount('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('setDefault', () => {
    it('should set an account as default', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockAccount as any);
      prismaMock.mobileMoneyAccount.updateMany.mockResolvedValue({ count: 1 } as any);
      prismaMock.mobileMoneyAccount.update.mockResolvedValue(mockAccount as any);

      const result = await accountService.setDefault('user-uuid-1', 'account-uuid-1');

      expect(result.message).toBe('Default account updated');
      expect(prismaMock.mobileMoneyAccount.updateMany).toHaveBeenCalled();
    });

    it('should throw NotFoundError for unverified account', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null);

      await expect(
        accountService.setDefault('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getDefaultAccount', () => {
    it('should return the default account', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockAccount as any);

      const result = await accountService.getDefaultAccount('user-uuid-1');

      expect(result).toBeDefined();
      expect(result!.isDefault).toBe(true);
    });

    it('should return fallback account if no default', async () => {
      prismaMock.mobileMoneyAccount.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockAccount as any);

      const result = await accountService.getDefaultAccount('user-uuid-1');

      expect(result).toBeDefined();
    });

    it('should return null if no verified accounts exist', async () => {
      prismaMock.mobileMoneyAccount.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await accountService.getDefaultAccount('user-uuid-1');

      expect(result).toBeNull();
    });
  });
});
