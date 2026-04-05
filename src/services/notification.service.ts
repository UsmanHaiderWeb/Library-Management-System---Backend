import { prisma } from '../helpers/prismaDb';
import logger from '../helpers/logger';

export class NotificationService {
  /**
   * Create a new notification for a user
   */
  static async createNotification(userId: string, title: string, message: string) {
    try {
      return await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          isRead: false
        }
      });
    } catch (error) {
      logger.error('Error creating notification:', error);
      // We don't throw here to avoid breaking the main transaction
      return null;
    }
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(userId: string, limit = 20) {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get unread count
   */
  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: { userId, isRead: false }
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    });
  }

  /**
   * Mark all as read
   */
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
  }
}
