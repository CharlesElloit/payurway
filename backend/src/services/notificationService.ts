import prisma from '../config/database';
import { NotificationType } from '@prisma/client';
import logger from '../utils/logger';

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export class NotificationService {
  async createNotification(userId: string, input: CreateNotificationInput) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          data: input.data || undefined,
        },
      });

      logger.debug({ notificationId: notification.id, userId, type: input.type }, 'Notification created');
      return notification;
    } catch (error: any) {
      logger.error({ userId, error: error.message }, 'Failed to create notification');
    }
  }

  async getNotifications(userId: string, page = 1, limit = 20, unreadOnly = false) {
    const skip = (Math.max(1, page) - 1) * limit;

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) return null;

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    return true;
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { message: 'All notifications marked as read' };
  }
}

export const notificationService = new NotificationService();
