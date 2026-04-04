import { Request, Response } from 'express';
import { RequestWithUser } from '../../helpers/interfaces';
import { NotificationService } from '../../services/notification.service';

/**
 * Get all notifications for the current student
 */
export const getNotificationsController = async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;
    const notifications = await NotificationService.getUserNotifications(user.id);
    const unreadCount = await NotificationService.getUnreadCount(user.id);

    res.json({
      notifications,
      unreadCount
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Mark a single notification as read
 */
export const markAsReadController = async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;
    const { notificationId } = req.params;

    await NotificationService.markAsRead(notificationId, user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Mark all notifications as read for the current student
 */
export const markAllAsReadController = async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;

    await NotificationService.markAllAsRead(user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
