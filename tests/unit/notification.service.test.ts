import { NotificationService } from '../../src/services/notification.service';
import { prisma } from '../../src/helpers/prismaDb';

jest.mock('../../src/helpers/prismaDb', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/helpers/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create a notification with isRead false', async () => {
      const mockNotification = {
        id: 'notif-1',
        userId: 'user-1',
        title: 'Book Due',
        message: 'Your book is due tomorrow',
        isRead: false,
      };
      (prisma.notification.create as jest.Mock).mockResolvedValue(mockNotification);

      const result = await NotificationService.createNotification('user-1', 'Book Due', 'Your book is due tomorrow');

      expect(result).toEqual(mockNotification);
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Book Due',
          message: 'Your book is due tomorrow',
          isRead: false,
        },
      });
    });

    it('should return null on error without throwing', async () => {
      (prisma.notification.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await NotificationService.createNotification('user-1', 'Title', 'Msg');

      expect(result).toBeNull();
    });
  });

  describe('getUserNotifications', () => {
    it('should return notifications ordered by createdAt desc', async () => {
      const mockNotifications = [
        { id: 'n1', title: 'New', createdAt: new Date() },
        { id: 'n2', title: 'Old', createdAt: new Date() },
      ];
      (prisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);

      const result = await NotificationService.getUserNotifications('user-1');

      expect(result).toEqual(mockNotifications);
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
    });

    it('should respect custom limit', async () => {
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      await NotificationService.getUserNotifications('user-1', 5);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(3);

      const result = await NotificationService.getUnreadCount('user-1');

      expect(result).toBe(3);
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
    });
  });

  describe('markAsRead', () => {
    it('should update the specific notification for the user', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await NotificationService.markAsRead('notif-1', 'user-1');

      expect(result).toEqual({ count: 1 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
        data: { isRead: true },
      });
    });

    it('should not update notifications belonging to other users', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await NotificationService.markAsRead('notif-1', 'wrong-user');

      expect(result).toEqual({ count: 0 });
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for the user', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await NotificationService.markAllAsRead('user-1');

      expect(result).toEqual({ count: 5 });
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('preference gating', () => {
    it('should allow everything when the user has no preference row', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue(null);

      expect(await NotificationService.isAllowed('user-1', 'inApp', 'Overdue')).toBe(true);
      expect(await NotificationService.isAllowed('user-1', 'email', 'Renewal')).toBe(true);
    });

    it('should allow transactional notifications regardless of preferences', async () => {
      expect(await NotificationService.isAllowed('user-1', 'inApp')).toBe(true);
      expect(prisma.notificationPreference.findUnique).not.toHaveBeenCalled();
    });

    it('should block a disabled category on the right channel only', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
        inAppOverdue: false,
        emailOverdue: true,
      });

      expect(await NotificationService.isAllowed('user-1', 'inApp', 'Overdue')).toBe(false);
      expect(await NotificationService.isAllowed('user-1', 'email', 'Overdue')).toBe(true);
    });

    it('should skip creating an in-app notification for a disabled category', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockResolvedValue({
        inAppDueReminder: false,
      });

      const result = await NotificationService.createNotification(
        'user-1',
        'Book Due Soon',
        'Reminder',
        'DueReminder',
      );

      expect(result).toBeNull();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should fail open if the preference lookup throws', async () => {
      (prisma.notificationPreference.findUnique as jest.Mock).mockRejectedValue(new Error('db down'));

      expect(await NotificationService.isAllowed('user-1', 'inApp', 'Overdue')).toBe(true);
    });
  });
});
