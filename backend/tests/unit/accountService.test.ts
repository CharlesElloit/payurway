import { prismaMock, redisMock, resetMocks } from '../mocks/setup';
import { mockAccount, mockPendingAccount, mockUser } from '../mocks/fixtures';
import { accountService } from '../../src/services/accountService';
import { carrierGatewayFactory } from '../../src/services/carrierGateway';
import { BadRequestError, NotFoundError, ConflictError } from '../../src/utils/errors';

jest.mock('../../src/utils/encryption', () => ({
  encryptPin: jest.fn((pin: string) => `encrypted:${pin}`),
  decryptPin: jest.fn((encrypted: string) => encrypted.replace('encrypted:', '')),
}));

beforeEach(() => {
  resetMocks();
  jest.restoreAllMocks();
});

describe('AccountService', () => {
  describe('linkAccount', () => {
    it('should link an MTN account successfully with PIN verification', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        verifyPin: jest.fn().mockResolvedValue(true),
      });
      prismaMock.mobileMoneyAccount.create.mockResolvedValue({
        ...mockAccount,
        verificationStatus: 'verified',
      } as any);

      const result = await accountService.linkAccount('user-uuid-1', '+256771234567', '1234', 'mtn');

      expect(result.id).toBeDefined();
      expect(result.carrier).toBe('mtn');
      expect(result.verificationStatus).toBe('verified');
      expect(result.message).toContain('verified');
    });

    it('should auto-detect MTN carrier from phone number', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        verifyPin: jest.fn().mockResolvedValue(true),
      });
      prismaMock.mobileMoneyAccount.create.mockResolvedValue(mockAccount as any);

      const result = await accountService.linkAccount('user-uuid-1', '0771234567', '1234');

      expect(result.carrier).toBe('mtn');
    });

    it('should auto-detect Airtel carrier from phone number', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        verifyPin: jest.fn().mockResolvedValue(true),
      });
      prismaMock.mobileMoneyAccount.create.mockResolvedValue({
        ...mockAccount,
        carrier: 'airtel',
      } as any);

      const result = await accountService.linkAccount('user-uuid-1', '0759876543', '1234');

      expect(result.carrier).toBe('airtel');
    });

    it('should throw BadRequestError if carrier cannot be detected', async () => {
      await expect(
        accountService.linkAccount('user-uuid-1', '12345', '1234')
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw ConflictError if phone already linked', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(mockAccount as any);

      await expect(
        accountService.linkAccount('user-uuid-1', '+256771234567', '1234', 'mtn')
      ).rejects.toThrow(ConflictError);
    });

    it('should throw CarrierError if PIN verification fails', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        verifyPin: jest.fn().mockRejectedValue(new Error('Invalid PIN')),
      });

      await expect(
        accountService.linkAccount('user-uuid-1', '+256771234567', '0000', 'mtn')
      ).rejects.toThrow('Invalid PIN');
    });

    it('should normalize phone number with country code', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        verifyPin: jest.fn().mockResolvedValue(true),
      });
      prismaMock.mobileMoneyAccount.create.mockResolvedValue(mockAccount as any);

      await accountService.linkAccount('user-uuid-1', '0771234567', '1234', 'mtn');

      expect(prismaMock.mobileMoneyAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phoneNumber: '256771234567',
          }),
        })
      );
    });

    it('should store encrypted PIN in the database', async () => {
      prismaMock.mobileMoneyAccount.findUnique.mockResolvedValue(null);
      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        verifyPin: jest.fn().mockResolvedValue(true),
      });
      prismaMock.mobileMoneyAccount.create.mockResolvedValue(mockAccount as any);

      await accountService.linkAccount('user-uuid-1', '+256771234567', '1234', 'mtn');

      expect(prismaMock.mobileMoneyAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            encryptedPin: 'encrypted:1234',
          }),
        })
      );
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

  describe('getDecryptedPin', () => {
    it('should return decrypted PIN for verified account', async () => {
      const accountWithPin = { ...mockAccount, encryptedPin: 'encrypted:1234' };
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(accountWithPin as any);

      const result = await accountService.getDecryptedPin('user-uuid-1', 'account-uuid-1');

      expect(result).toBe('1234');
    });

    it('should return null if no encrypted PIN stored', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(mockAccount as any);

      const result = await accountService.getDecryptedPin('user-uuid-1', 'account-uuid-1');

      expect(result).toBeNull();
    });

    it('should throw NotFoundError for unknown account', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null);

      await expect(
        accountService.getDecryptedPin('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getBalance', () => {
    it('should return cached balance if fresh (< 5 min old)', async () => {
      const freshAccount = {
        ...mockAccount,
        balance: 50000,
        balanceUpdatedAt: new Date(Date.now() - 60 * 1000),
      };
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(freshAccount as any);

      const result = await accountService.getBalance('user-uuid-1', 'account-uuid-1');

      expect(result.balance).toBe(50000);
      expect(result.fresh).toBe(false);
    });

    it('should refresh balance if stale (> 5 min old)', async () => {
      const staleAccount = {
        ...mockAccount,
        balance: 50000,
        balanceUpdatedAt: new Date(Date.now() - 10 * 60 * 1000),
      };
      const updatedAccount = {
        ...staleAccount,
        balance: 45000,
        balanceUpdatedAt: new Date(),
      };

      prismaMock.mobileMoneyAccount.findFirst
        .mockResolvedValueOnce(staleAccount as any)
        .mockResolvedValueOnce(updatedAccount as any);

      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        getBalance: jest.fn().mockResolvedValue({ balance: 45000, currency: 'UGX' }),
      });
      prismaMock.mobileMoneyAccount.update.mockResolvedValue(updatedAccount as any);

      const result = await accountService.getBalance('user-uuid-1', 'account-uuid-1');

      expect(result.balance).toBe(45000);
      expect(result.fresh).toBe(true);
    });

    it('should return stale balance if carrier refresh fails', async () => {
      const staleAccount = {
        ...mockAccount,
        balance: 30000,
        balanceUpdatedAt: new Date(Date.now() - 10 * 60 * 1000),
      };
      prismaMock.mobileMoneyAccount.findFirst
        .mockResolvedValueOnce(staleAccount as any)
        .mockResolvedValueOnce(staleAccount as any);

      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        getBalance: jest.fn().mockRejectedValue(new Error('carrier down')),
      });

      const result = await accountService.getBalance('user-uuid-1', 'account-uuid-1');

      expect(result.balance).toBe(30000);
      expect(result.fresh).toBe(false);
    });

    it('should throw NotFoundError for unverified account', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null);

      await expect(
        accountService.getBalance('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('refreshBalance', () => {
    it('should fetch fresh balance from carrier and update DB', async () => {
      const account = { ...mockAccount, balance: 10000, balanceUpdatedAt: null };
      const updatedAccount = { ...account, balance: 25000, balanceUpdatedAt: new Date() };

      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(account as any);
      (carrierGatewayFactory as jest.Mock).mockReturnValue({
        getBalance: jest.fn().mockResolvedValue({ balance: 25000, currency: 'UGX' }),
      });
      prismaMock.mobileMoneyAccount.update.mockResolvedValue(updatedAccount as any);

      const result = await accountService.refreshBalance('user-uuid-1', 'account-uuid-1');

      expect(result.balance).toBe(25000);
      expect(result.fresh).toBe(true);
      expect(result.currency).toBe('UGX');
      expect(prismaMock.mobileMoneyAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'account-uuid-1' },
          data: expect.objectContaining({ balance: 25000 }),
        })
      );
    });

    it('should throw if account not found', async () => {
      prismaMock.mobileMoneyAccount.findFirst.mockResolvedValue(null);

      await expect(
        accountService.refreshBalance('user-uuid-1', 'unknown-id')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('updateAccountBalance', () => {
    it('should update balance and balanceUpdatedAt', async () => {
      prismaMock.mobileMoneyAccount.update.mockResolvedValue({} as any);

      await accountService.updateAccountBalance('user-uuid-1', 'account-uuid-1', 75000);

      expect(prismaMock.mobileMoneyAccount.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'account-uuid-1' },
          data: expect.objectContaining({ balance: 75000 }),
        })
      );
    });

    it('should not throw if update fails', async () => {
      prismaMock.mobileMoneyAccount.update.mockRejectedValue(new Error('db error'));

      await expect(
        accountService.updateAccountBalance('user-uuid-1', 'account-uuid-1', 75000)
      ).resolves.toBeUndefined();
    });
  });
});
