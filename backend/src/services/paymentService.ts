import prisma from '../config/database';
import { redis } from '../config/redis';
import { Carrier, PaymentStatus } from '../types';
import { generateTransactionReference } from '../utils/helpers';
import { carrierGatewayFactory } from './carrierGateway';
import { notificationService } from './notificationService';
import { accountService } from './accountService';
import { NotFoundError, BadRequestError, ForbiddenError, CarrierError } from '../utils/errors';
import logger from '../utils/logger';

export class PaymentService {
  async initiatePayment(data: {
    senderId?: string;
    senderPhone: string;
    receiverId?: string;
    receiverPhone: string;
    amount: number;
    carrier: Carrier;
    description?: string;
    currency?: string;
    qrCodeId?: string;
  }) {
    const reference = generateTransactionReference();

    const payment = await prisma.payment.create({
      data: {
        reference,
        amount: data.amount,
        currency: data.currency || 'UGX',
        description: data.description || null,
        status: 'pending',
        senderPhone: data.senderPhone,
        receiverPhone: data.receiverPhone,
        senderId: data.senderId || null,
        receiverId: data.receiverId || null,
        carrier: data.carrier,
        qrCodeId: data.qrCodeId || null,
      },
    });

    logger.info({ paymentId: payment.id, reference, carrier: data.carrier }, 'Payment initiated');

    this.processPaymentAsync(payment.id).catch((err) => {
      logger.error({ paymentId: payment.id, err }, 'Async payment processing failed');
    });

    return {
      id: payment.id,
      reference: payment.reference,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      carrier: payment.carrier,
      createdAt: payment.createdAt,
    };
  }

  async processPaymentAsync(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    try {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'processing' },
      });

      const gateway = carrierGatewayFactory(payment.carrier as Carrier);
      const callbackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/webhooks/${payment.carrier}`;

      const result = await gateway.requestToPay({
        amount: Number(payment.amount),
        currency: payment.currency,
        senderPhone: payment.senderPhone,
        receiverPhone: payment.receiverPhone,
        reference: payment.reference,
        externalId: paymentId,
        callbackUrl,
      });

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          carrierTransactionId: result.transactionId,
          status: result.status === 'completed' ? 'completed' : 'processing',
          completedAt: result.status === 'completed' ? new Date() : null,
        },
      });

      if (result.status === 'completed') {
        await this.onPaymentCompleted(paymentId);
      } else if (result.status === 'failed') {
        await this.onPaymentFailed(paymentId, result.message || 'Payment failed');
      }
    } catch (error: any) {
      logger.error({ paymentId, error: error.message }, 'Payment processing error');
      await this.onPaymentFailed(paymentId, error.message || 'Payment processing failed');
    }
  }

  async processTransferAsync(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    try {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'processing' },
      });

      const gateway = carrierGatewayFactory(payment.carrier as Carrier);
      const callbackUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/v1/webhooks/${payment.carrier}`;

      const result = await gateway.transfer({
        amount: Number(payment.amount),
        currency: payment.currency,
        receiverPhone: payment.receiverPhone,
        reference: payment.reference,
        externalId: paymentId,
        callbackUrl,
      });

      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          carrierTransactionId: result.transactionId,
          status: result.status === 'completed' ? 'completed' : 'processing',
          completedAt: result.status === 'completed' ? new Date() : null,
        },
      });

      if (result.status === 'completed') {
        await this.onPaymentCompleted(paymentId);
      } else if (result.status === 'failed') {
        await this.onPaymentFailed(paymentId, result.message || 'Transfer failed');
      }
    } catch (error: any) {
      logger.error({ paymentId, error: error.message }, 'Transfer processing error');
      await this.onPaymentFailed(paymentId, error.message || 'Transfer processing failed');
    }
  }

  async handleWebhook(carrier: Carrier, carrierTransactionId: string, status: PaymentStatus, response?: any) {
    const payment = await prisma.payment.findFirst({
      where: {
        carrier,
        carrierTransactionId,
      },
    });

    if (!payment) {
      logger.warn({ carrierTransactionId, carrier }, 'Webhook received for unknown payment');
      return;
    }

    if (payment.status === 'completed' || payment.status === 'failed' || payment.status === 'cancelled') {
      logger.info({ paymentId: payment.id, status: payment.status }, 'Payment already finalized');
      return;
    }

    const updateData: any = {
      status,
      carrierResponse: response || undefined,
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else if (status === 'failed') {
      updateData.failedAt = new Date();
      updateData.failureReason = response?.reason || 'Carrier reported failure';
    }

    await prisma.payment.update({ where: { id: payment.id }, data: updateData });

    if (status === 'completed') {
      await this.onPaymentCompleted(payment.id);
    } else if (status === 'failed') {
      await this.onPaymentFailed(payment.id, updateData.failureReason || 'Payment failed');
    }
  }

  async getPayment(userId: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.senderId !== userId && payment.receiverId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return this.formatPayment(payment);
  }

  async getPaymentByReference(userId: string, reference: string) {
    const payment = await prisma.payment.findUnique({ where: { reference } });
    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.senderId !== userId && payment.receiverId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return this.formatPayment(payment);
  }

  async getPayments(userId: string, page = 1, limit = 20, status?: PaymentStatus) {
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const take = Math.min(100, Math.max(1, limit));

    const where = {
      OR: [{ senderId: userId }, { receiverId: userId }],
      ...(status ? { status } : {}),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((p) => this.formatPayment(p)),
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async cancelPayment(userId: string, paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment not found');

    if (payment.senderId !== userId) throw new ForbiddenError('Only the sender can cancel');

    if (payment.status !== 'pending' && payment.status !== 'processing') {
      throw new BadRequestError(`Cannot cancel payment in ${payment.status} status`);
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'cancelled' },
    });

    return { message: 'Payment cancelled' };
  }

  async requestPayment(data: {
    requesterId: string;
    targetPhone: string;
    amount: number;
    description?: string;
    carrier: Carrier;
  }) {
    const requester = await prisma.user.findUnique({ where: { id: data.requesterId } });
    if (!requester) throw new NotFoundError('User not found');

    const targetUser = await prisma.user.findUnique({ where: { phone: data.targetPhone } });
    if (!targetUser) throw new NotFoundError('No user found with this phone number');

    const reference = generateTransactionReference();

    const payment = await prisma.payment.create({
      data: {
        reference,
        amount: data.amount,
        currency: 'UGX',
        description: data.description || null,
        status: 'requested',
        senderPhone: data.targetPhone,
        receiverPhone: requester.phone,
        senderId: targetUser.id,
        receiverId: data.requesterId,
        carrier: data.carrier,
      },
    });

    await notificationService.createNotification(targetUser.id, {
      type: 'payment_requested',
      title: 'Payment Request',
      body: `${requester.firstName || requester.phone} is requesting UGX ${data.amount.toLocaleString()}`,
      data: {
        paymentId: payment.id,
        reference: payment.reference,
        amount: data.amount,
        requesterPhone: requester.phone,
        carrier: data.carrier,
      },
    });

    logger.info({ paymentId: payment.id, reference, requesterId: data.requesterId, targetUserId: targetUser.id }, 'Payment request created');

    return {
      id: payment.id,
      reference: payment.reference,
      amount: payment.amount,
      targetPhone: data.targetPhone,
      status: payment.status,
      message: 'Payment request sent',
    };
  }

  async respondToRequest(userId: string, paymentId: string, action: 'accept' | 'reject') {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment request not found');

    if (payment.senderId !== userId) {
      throw new ForbiddenError('Only the payer can respond to this request');
    }

    if (payment.status !== 'requested') {
      throw new BadRequestError(`Cannot ${action} a request in ${payment.status} status`);
    }

    if (action === 'reject') {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'cancelled' },
      });

      if (payment.receiverId) {
        await notificationService.createNotification(payment.receiverId, {
          type: 'payment_failed',
          title: 'Payment Request Declined',
          body: `Your payment request of UGX ${Number(payment.amount).toLocaleString()} was declined`,
          data: { paymentId, reference: payment.reference },
        });
      }

      return { message: 'Payment request rejected' };
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'pending' },
    });

    this.processPaymentAsync(paymentId).catch((err) => {
      logger.error({ paymentId, err }, 'Async payment processing failed');
    });

    if (payment.receiverId) {
      await notificationService.createNotification(payment.receiverId, {
        type: 'payment_sent',
        title: 'Payment Request Accepted',
        body: `Payment of UGX ${Number(payment.amount).toLocaleString()} is being processed`,
        data: { paymentId, reference: payment.reference, amount: Number(payment.amount) },
      });
    }

    return { message: 'Payment accepted and processing', paymentId };
  }

  async getPaymentRequests(userId: string, page = 1, limit = 20) {
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
    const take = Math.min(100, Math.max(1, limit));

    const where = {
      senderId: userId,
      status: 'requested' as const,
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((p) => this.formatPayment(p)),
      meta: {
        total,
        page,
        limit: take,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  private async onPaymentCompleted(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    if (payment.receiverId) {
      await notificationService.createNotification(payment.receiverId, {
        type: 'payment_received',
        title: 'Payment Received',
        body: `You received UGX ${Number(payment.amount).toLocaleString()} from ${payment.senderPhone}`,
        data: {
          paymentId: payment.id,
          reference: payment.reference,
          amount: Number(payment.amount),
          currency: payment.currency,
        },
      });

      this.refreshLinkedBalance(payment.receiverId, payment.receiverPhone, Number(payment.amount), 'credit').catch((err) => {
        logger.warn({ paymentId, userId: payment.receiverId, error: err.message }, 'Failed to refresh receiver balance');
      });
    }

    if (payment.senderId) {
      await notificationService.createNotification(payment.senderId, {
        type: 'payment_sent',
        title: 'Payment Sent',
        body: `You sent UGX ${Number(payment.amount).toLocaleString()} to ${payment.receiverPhone}`,
        data: {
          paymentId: payment.id,
          reference: payment.reference,
          amount: Number(payment.amount),
          currency: payment.currency,
        },
      });

      this.refreshLinkedBalance(payment.senderId, payment.senderPhone, Number(payment.amount), 'debit').catch((err) => {
        logger.warn({ paymentId, userId: payment.senderId, error: err.message }, 'Failed to refresh sender balance');
      });
    }

    logger.info({ paymentId, reference: payment.reference }, 'Payment completed');
  }

  private async refreshLinkedBalance(userId: string, phone: string, amount: number, type: 'credit' | 'debit') {
    const account = await prisma.mobileMoneyAccount.findFirst({
      where: { userId, phoneNumber: phone, isActive: true, verificationStatus: 'verified' },
    });

    if (!account) {
      logger.debug({ userId, phone }, 'No linked account found for balance update');
      return;
    }

    try {
      await accountService.refreshBalance(userId, account.id);
    } catch {
      const adjustment = type === 'credit' ? amount : -amount;
      const newBalance = (account.balance ? Number(account.balance) : 0) + adjustment;
      await accountService.updateAccountBalance(userId, account.id, Math.max(0, newBalance));
      logger.info({ accountId: account.id, adjustment, newBalance }, 'Balance adjusted locally after transaction');
    }
  }

  private async onPaymentFailed(paymentId: string, reason: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        failedAt: new Date(),
        failureReason: reason,
      },
    });

    if (payment.senderId) {
      await notificationService.createNotification(payment.senderId, {
        type: 'payment_failed',
        title: 'Payment Failed',
        body: `Your payment of UGX ${Number(payment.amount).toLocaleString()} to ${payment.receiverPhone} failed: ${reason}`,
        data: {
          paymentId: payment.id,
          reference: payment.reference,
          reason,
        },
      });
    }

    logger.warn({ paymentId, reference: payment.reference, reason }, 'Payment failed');
  }

  private formatPayment(payment: any) {
    return {
      id: payment.id,
      reference: payment.reference,
      amount: Number(payment.amount),
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      senderPhone: payment.senderPhone,
      receiverPhone: payment.receiverPhone,
      carrier: payment.carrier,
      carrierTransactionId: payment.carrierTransactionId,
      failureReason: payment.failureReason,
      completedAt: payment.completedAt,
      failedAt: payment.failedAt,
      createdAt: payment.createdAt,
    };
  }
}

export const paymentService = new PaymentService();
