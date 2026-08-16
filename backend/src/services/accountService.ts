import prisma from '../config/database';
import { Carrier } from '../types';
import { normalizePhoneNumber, detectCarrier, generateOTP } from '../utils/helpers';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/errors';
import { redis } from '../config/redis';
import logger from '../utils/logger';

export class AccountService {
  async linkAccount(userId: string, phoneNumber: string, carrier?: Carrier) {
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

    const verifyToken = generateOTP();

    const account = await prisma.mobileMoneyAccount.create({
      data: {
        userId,
        phoneNumber: normalizedPhone,
        carrier: detectedCarrier,
        verificationToken: verifyToken,
        verificationStatus: 'pending',
      },
    });

    await redis.setex(
      `verify:${account.id}`,
      300,
      JSON.stringify({ token: verifyToken })
    );

    logger.info({ userId, accountId: account.id, carrier: detectedCarrier }, 'Account linked, verification pending');

    return {
      id: account.id,
      phoneNumber: account.phoneNumber,
      carrier: account.carrier,
      verificationStatus: account.verificationStatus,
      message: 'Verification OTP sent to your mobile money number',
    };
  }

  async verifyAccount(userId: string, accountId: string, otp: string) {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) throw new NotFoundError('Account not found');

    if (account.verificationStatus === 'verified') {
      return { message: 'Account already verified', status: 'verified' };
    }

    const key = `verify:${account.id}`;
    const stored = await redis.get(key);

    if (!stored) {
      throw new BadRequestError('Verification expired. Please link the account again.');
    }

    const data = JSON.parse(stored);
    if (data.token !== otp) {
      throw new BadRequestError('Invalid verification code');
    }

    await redis.del(key);

    const updated = await prisma.mobileMoneyAccount.update({
      where: { id: accountId },
      data: {
        verificationStatus: 'verified',
        verifiedAt: new Date(),
        verificationToken: null,
      },
    });

    logger.info({ userId, accountId }, 'Account verified');

    return {
      id: updated.id,
      phoneNumber: updated.phoneNumber,
      carrier: updated.carrier,
      verificationStatus: updated.verificationStatus,
      message: 'Account verified successfully',
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
}

export const accountService = new AccountService();
