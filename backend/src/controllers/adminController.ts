import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../config/database';

export class AdminController {
  async getTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status, carrier } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (status) where.status = status;
      if (carrier) where.carrier = carrier;

      const [transactions, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.payment.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          data: transactions.map((t) => ({
            id: t.id,
            reference: t.reference,
            amount: Number(t.amount),
            currency: t.currency,
            status: t.status,
            senderPhone: t.senderPhone,
            receiverPhone: t.receiverPhone,
            carrier: t.carrier,
            createdAt: t.createdAt,
          })),
          meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
          select: {
            id: true,
            email: true,
            phone: true,
            firstName: true,
            lastName: true,
            isVerified: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            _count: { select: { sentPayments: true, receivedPayments: true } },
          },
        }),
        prisma.user.count(),
      ]);

      res.json({
        success: true,
        data: {
          data: users,
          meta: {
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        activeUsers,
        totalPayments,
        completedPayments,
        failedPayments,
        totalVolume,
        monthlyVolume,
        todayPayments,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.payment.count(),
        prisma.payment.count({ where: { status: 'completed' } }),
        prisma.payment.count({ where: { status: 'failed' } }),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'completed' } }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: 'completed', createdAt: { gte: thisMonth } },
        }),
        prisma.payment.count({ where: { createdAt: { gte: today } } }),
      ]);

      res.json({
        success: true,
        data: {
          users: { total: totalUsers, active: activeUsers },
          payments: {
            total: totalPayments,
            completed: completedPayments,
            failed: failedPayments,
            today: todayPayments,
            successRate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(2) + '%' : '0%',
          },
          volume: {
            total: Number(totalVolume._sum.amount || 0),
            monthly: Number(monthlyVolume._sum.amount || 0),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
