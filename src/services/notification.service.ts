import { prisma } from '../helpers/prismaDb';
import logger from '../helpers/logger';

/**
 * Preference-gated notification categories. Maps to the boolean pairs on the
 * NotificationPreference model (inApp<Category> / email<Category>).
 * Notifications without a category are transactional and always delivered.
 */
export type NotificationCategory =
  | 'BorrowStatus'
  | 'DueReminder'
  | 'Overdue'
  | 'Reservation'
  | 'Renewal'
  | 'Purchase';

export class NotificationService {
  /**
   * Check whether a user allows a channel+category combination.
   * No preference row (or no category) means allowed — defaults are all-on.
   */
  static async isAllowed(
    userId: string,
    channel: 'inApp' | 'email',
    category?: NotificationCategory,
  ): Promise<boolean> {
    if (!category) return true;
    try {
      const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });
      if (!prefs) return true;
      const field = `${channel}${category}` as keyof typeof prefs;
      return prefs[field] !== false;
    } catch (error) {
      logger.error('Error reading notification preferences:', error);
      return true; // never let a preference lookup block a notification
    }
  }

  /**
   * Create a new notification for a user.
   * Pass a category to respect the user's in-app notification preferences;
   * omit it for transactional notifications that must always be delivered.
   */
  static async createNotification(
    userId: string,
    title: string,
    message: string,
    category?: NotificationCategory,
  ) {
    try {
      if (!(await this.isAllowed(userId, 'inApp', category))) {
        return null;
      }
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
