import prisma from '../config/database';
import { Carrier } from '../types';
import { normalizePhoneNumber, detectCarrier } from '../utils/helpers';
import { encryptPin, decryptPin } from '../utils/encryption';
import { BadRequestError, NotFoundError, ConflictError, CarrierError } from '../utils/errors';
import { carrierGatewayFactory } from './carrierGateway';
import logger from '../utils/logger';

export class AccountService {
  async linkAccount(userId: string, phoneNumber: string, pin: string, carrier?: Carrier) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const detectedCarrier = carrier || detectCarrier(normalizedPhone);

    if (!detectedCarrier) {
      throw new BadRequestError('Could not detect carrier. Please specify the carrier explicitly.');
    }

    const existing = await prisma.mobileMoneyAccount.findUnique({
      where: { userId_phoneNumber: { userId, phoneNumber: normalizedPhone } },
    });

    if (existing) {
      throw new ConflictError('This phone number is already linked to your account');
    }

    const gateway = carrierGatewayFactory(detectedCarrier);
    await gateway.verifyPin(normalizedPhone, pin);

    const encryptedPin = encryptPin(pin);

    const account = await prisma.mobileMoneyAccount.create({
      data: {
        userId,
        phoneNumber: normalizedPhone,
        carrier: detectedCarrier,
        encryptedPin,
        verificationStatus: 'verified',
        verifiedAt: new Date(),
      },
    });

    logger.info({ userId, accountId: account.id, carrier: detectedCarrier }, 'Account linked and verified via PIN');

    return {
      id: account.id,
      phoneNumber: account.phoneNumber,
      carrier: account.carrier,
      verificationStatus: account.verificationStatus,
      message: 'Account linked and verified successfully',
    };
  }

  async getAccounts(userId: string) {
    const accounts = await prisma.mobileMoneyAccount.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return accounts.map((a) => ({
      id: a.id,
      phoneNumber: a.phoneNumber,
      carrier: a.carrier,
      verificationStatus: a.verificationStatus,
      isDefault: a.isDefault,
      verifiedAt: a.verifiedAt,
    }));
  }

  async getAccount(userId: string, accountId: string) {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
    });

    if (!account) throw new NotFoundError('Account not found');

    return {
      id: account.id,
      phoneNumber: account.phoneNumber,
      carrier: account.carrier,
      verificationStatus: account.verificationStatus,
      isDefault: account.isDefault,
      verifiedAt: account.verifiedAt,
    };
  }

  async removeAccount(userId: string, accountId: string) {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { id: accountId, userId, isActive: true },
    });

    if (!account) throw new NotFoundError('Account not found');

    await prisma.mobileMoneyAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    if (account.isDefault) {
      const next = await prisma.mobileMoneyAccount.findFirst({
        where: { userId, isActive: true, id: { not: accountId } },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await prisma.mobileMoneyAccount.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    logger.info({ userId, accountId }, 'Account removed');

    return { message: 'Account removed successfully' };
  }

  async setDefault(userId: string, accountId: string) {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { id: accountId, userId, isActive: true, verificationStatus: 'verified' },
    });

    if (!account) throw new NotFoundError('Verified account not found');

    await prisma.mobileMoneyAccount.updateMany({
      where: { userId, isActive: true },
      data: { isDefault: false },
    });

    await prisma.mobileMoneyAccount.update({
      where: { id: accountId },
      data: { isDefault: true },
    });

    return { message: 'Default account updated' };
  }

  async getDefaultAccount(userId: string) {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { userId, isActive: true, isDefault: true, verificationStatus: 'verified' },
    });

    if (!account) {
      const fallback = await prisma.mobileMoneyAccount.findFirst({
        where: { userId, isActive: true, verificationStatus: 'verified' },
        orderBy: { createdAt: 'desc' },
      });
      return fallback;
    }

    return account;
  }

  async getDecryptedPin(userId: string, accountId: string): Promise<string | null> {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { id: accountId, userId, isActive: true, verificationStatus: 'verified' },
    });

    if (!account) throw new NotFoundError('Verified account not found');

    if (!account.encryptedPin) return null;

    return decryptPin(account.encryptedPin);
  }

  async getAccountByPhone(userId: string, phoneNumber: string) {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    return prisma.mobileMoneyAccount.findFirst({
      where: { userId, phoneNumber: normalizedPhone, isActive: true, verificationStatus: 'verified' },
    });
  }

  async getBalance(userId: string, accountId: string) {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { id: accountId, userId, isActive: true, verificationStatus: 'verified' },
    });

    if (!account) throw new NotFoundError('Verified account not found');

    if (account.balance !== null && account.balanceUpdatedAt) {
      const age = Date.now() - account.balanceUpdatedAt.getTime();
      if (age < 5 * 60 * 1000) {
        return {
          accountId: account.id,
          phoneNumber: account.phoneNumber,
          carrier: account.carrier,
          balance: Number(account.balance),
          currency: 'UGX',
          lastUpdated: account.balanceUpdatedAt,
          fresh: false,
        };
      }
    }

    try {
      return await this.refreshBalance(userId, accountId);
    } catch {
      return {
        accountId: account.id,
        phoneNumber: account.phoneNumber,
        carrier: account.carrier,
        balance: account.balance ? Number(account.balance) : null,
        currency: 'UGX',
        lastUpdated: account.balanceUpdatedAt,
        fresh: false,
      };
    }
  }

  async refreshBalance(userId: string, accountId: string) {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { id: accountId, userId, isActive: true, verificationStatus: 'verified' },
    });

    if (!account) throw new NotFoundError('Verified account not found');

    const gateway = carrierGatewayFactory(account.carrier as Carrier);
    const result = await gateway.getBalance(account.phoneNumber);

    const updated = await prisma.mobileMoneyAccount.update({
      where: { id: accountId },
      data: {
        balance: result.balance,
        balanceUpdatedAt: new Date(),
      },
    });

    logger.info({ userId, accountId, balance: result.balance }, 'Account balance refreshed');

    return {
      accountId: updated.id,
      phoneNumber: updated.phoneNumber,
      carrier: updated.carrier,
      balance: result.balance,
      currency: result.currency,
      lastUpdated: updated.balanceUpdatedAt,
      fresh: true,
    };
  }

  async updateAccountBalance(userId: string, accountId: string, balance: number) {
    await prisma.mobileMoneyAccount.update({
      where: { id: accountId },
      data: {
        balance,
        balanceUpdatedAt: new Date(),
      },
    }).catch((err) => {
      logger.warn({ accountId, error: err.message }, 'Failed to update account balance after transaction');
    });
  }
}

export const accountService = new AccountService();
