import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { notificationService } from '../services/notificationService';

export class NotificationController {
  async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page, limit, unreadOnly } = req.query;
      const result = await notificationService.getNotifications(
        req.user!.id,
        Number(page) || 1,
        Number(limit) || 20,
        unreadOnly === 'true'
      );
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAsRead(req.user!.id, req.params.id);
      if (!result) {
        res.status(404).json({ success: false, error: { message: 'Notification not found' } });
        return;
      }
      res.json({ success: true, data: { message: 'Marked as read' } });
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await notificationService.markAllAsRead(req.user!.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationController = new NotificationController();
