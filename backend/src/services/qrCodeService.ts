import QRCodeLib from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { redis } from '../config/redis';
import { config } from '../config';
import { Carrier, QRCodeData } from '../types';
import { signQRCodeData, generateTransactionReference, normalizePhoneNumber, detectCarrier } from '../utils/helpers';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import logger from '../utils/logger';

export class QRCodeService {
  async generateQRCode(userId: string, data: {
    amount?: number;
    carrier: Carrier;
    currency?: string;
    description?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const account = await prisma.mobileMoneyAccount.findFirst({
      where: {
        userId,
        carrier: data.carrier,
        isActive: true,
        verificationStatus: 'verified',
      },
    });

    if (!account) {
      throw new BadRequestError(`No verified ${data.carrier.toUpperCase()} account linked. Please link and verify one first.`);
    }

    const qrId = uuidv4();
    const expiresAt = new Date(Date.now() + config.qrCode.expirySeconds * 1000);

    const payloadForSignature = JSON.stringify({
      id: qrId,
      userId,
      phone: account.phoneNumber,
      carrier: data.carrier,
      amount: data.amount || null,
      expiresAt: expiresAt.toISOString(),
    });

    const signature = signQRCodeData(payloadForSignature);

    const qrRecord = await prisma.qRCode.create({
      data: {
        id: qrId,
        userId,
        phone: account.phoneNumber,
        carrier: data.carrier,
        amount: data.amount || null,
        currency: data.currency || 'UGX',
        description: data.description || null,
        signature,
        isOneTime: true,
        isActive: true,
        expiresAt,
      },
    });

    const qrCodeData: QRCodeData = {
      id: qrId,
      receiverId: userId,
      receiverName: `${user.firstName} ${user.lastName}`,
      receiverPhone: account.phoneNumber,
      amount: data.amount || undefined,
      carrier: data.carrier,
      currency: data.currency || 'UGX',
      createdAt: qrRecord.createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const qrString = `paymybills://${data.carrier}/${qrId}?sig=${signature}`;
    const qrImage = await QRCodeLib.toDataURL(qrString, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    });

    await redis.setex(
      `qr:${qrId}`,
      config.qrCode.expirySeconds,
      JSON.stringify(qrCodeData)
    );

    logger.info({ userId, qrId, carrier: data.carrier }, 'QR code generated');

    return {
      id: qrId,
      qrImage,
      qrData: qrCodeData,
      expiresAt,
    };
  }

  async getQRCode(codeId: string) {
    const cached = await redis.get(`qr:${codeId}`);
    if (cached) {
      return JSON.parse(cached) as QRCodeData;
    }

    const qrRecord = await prisma.qRCode.findUnique({ where: { id: codeId } });

    if (!qrRecord || !qrRecord.isActive) {
      throw new NotFoundError('QR code not found or deactivated');
    }

    if (qrRecord.expiresAt < new Date()) {
      throw new BadRequestError('QR code has expired');
    }

    if (qrRecord.isOneTime && qrRecord.isUsed) {
      throw new BadRequestError('QR code has already been used');
    }

    const user = await prisma.user.findUnique({ where: { id: qrRecord.userId } });
    if (!user) throw new NotFoundError('Receiver not found');

    const qrCodeData: QRCodeData = {
      id: qrRecord.id,
      receiverId: qrRecord.userId,
      receiverName: `${user.firstName} ${user.lastName}`,
      receiverPhone: qrRecord.phone,
      amount: qrRecord.amount ? Number(qrRecord.amount) : undefined,
      carrier: qrRecord.carrier as Carrier,
      currency: qrRecord.currency,
      createdAt: qrRecord.createdAt.toISOString(),
      expiresAt: qrRecord.expiresAt.toISOString(),
    };

    return qrCodeData;
  }

  async validateAndConsumeQRCode(codeId: string, signature: string) {
    const qrData = await this.getQRCode(codeId);

    const expectedSig = signQRCodeData(
      JSON.stringify({
        id: qrData.id,
        userId: qrData.receiverId,
        phone: qrData.receiverPhone,
        carrier: qrData.carrier,
        amount: qrData.amount || null,
        expiresAt: qrData.expiresAt,
      })
    );

    if (signature !== expectedSig) {
      throw new BadRequestError('Invalid QR code signature');
    }

    const qrRecord = await prisma.qRCode.findUnique({ where: { id: codeId } });
    if (!qrRecord) throw new NotFoundError('QR code not found');

    if (qrRecord.isOneTime && qrRecord.isUsed) {
      throw new BadRequestError('QR code has already been used');
    }

    if (qrRecord.isOneTime) {
      await prisma.qRCode.update({
        where: { id: codeId },
        data: { isUsed: true, usedAt: new Date() },
      });
      await redis.del(`qr:${codeId}`);
    }

    return qrData;
  }

  async getQRHistory(userId: string, page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * limit;

    const [codes, total] = await Promise.all([
      prisma.qRCode.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.qRCode.count({ where: { userId } }),
    ]);

    return {
      data: codes.map((c) => ({
        id: c.id,
        phone: c.phone,
        carrier: c.carrier,
        amount: c.amount,
        currency: c.currency,
        isUsed: c.isUsed,
        isActive: c.isActive,
        expiresAt: c.expiresAt,
        usedAt: c.usedAt,
        createdAt: c.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async revokeQRCode(userId: string, codeId: string) {
    const qr = await prisma.qRCode.findFirst({ where: { id: codeId, userId } });
    if (!qr) throw new NotFoundError('QR code not found');

    await prisma.qRCode.update({
      where: { id: codeId },
      data: { isActive: false },
    });
    await redis.del(`qr:${codeId}`);

    return { message: 'QR code revoked successfully' };
  }
}

export const qrCodeService = new QRCodeService();
