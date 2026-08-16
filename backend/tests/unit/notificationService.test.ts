import { prismaMock, resetMocks } from '../mocks/setup';
import { mockNotification } from '../mocks/fixtures';

const RealNotificationService = jest.requireActual('../../src/services/notificationService').NotificationService;
const notificationService = new RealNotificationService();

beforeEach(() => {
  resetMocks();
});

describe('NotificationService', () => {
  describe('createNotification', () => {
    it('should create a notification', async () => {
      prismaMock.notification.create.mockResolvedValue(mockNotification as any);

      const result = await notificationService.createNotification('user-uuid-1', {
        type: 'payment_received',
        title: 'Payment Received',
        body: 'You received UGX 50,000',
      });

      expect(result).toBeDefined();
      expect(result!.title).toBe('Payment Received');
      expect(prismaMock.notification.create).toHaveBeenCalledTimes(1);
    });

    it('should store data payload', async () => {
      prismaMock.notification.create.mockResolvedValue(mockNotification as any);

      await notificationService.createNotification('user-uuid-1', {
        type: 'payment_sent',
        title: 'Payment Sent',
        body: 'Sent UGX 50,000',
        data: { paymentId: 'pay-1', amount: 50000 },
      });

      expect(prismaMock.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            data: { paymentId: 'pay-1', amount: 50000 },
          }),
        })
      );
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications with unread count', async () => {
      prismaMock.notification.findMany.mockResolvedValue([mockNotification] as any);
      prismaMock.notification.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await notificationService.getNotifications('user-uuid-1', 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.unreadCount).toBe(1);
    });

    it('should filter by unread only', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await notificationService.getNotifications('user-uuid-1', 1, 20, true);

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        })
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(mockNotification as any);
      prismaMock.notification.update.mockResolvedValue({ ...mockNotification, isRead: true } as any);

      const result = await notificationService.markAsRead('user-uuid-1', 'notif-uuid-1');

      expect(result).toBe(true);
      expect(prismaMock.notification.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRead: true }),
        })
      );
    });

    it('should return null if notification not found', async () => {
      prismaMock.notification.findFirst.mockResolvedValue(null);

      const result = await notificationService.markAsRead('user-uuid-1', 'unknown-id');

      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 5 } as any);

      const result = await notificationService.markAllAsRead('user-uuid-1');

      expect(result.message).toBe('All notifications marked as read');
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isRead: true }),
        })
      );
    });
  });
});
