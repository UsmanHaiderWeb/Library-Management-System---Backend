/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { prisma } from '../../helpers/prismaDb';

/**
 * Get User's Notifications
 */
export const getNotificationsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user || !user.id) {
            res.status(400).json({ message: 'User not found in request' });
            return;
        }

        const notifications = await prisma.notification.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to recent 50
        });

        const unreadCount = notifications.filter(n => !n.isRead).length;

        res.status(200).json({ notifications, unreadCount });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error while fetching notifications' });
    }
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsReadController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { id } = req.params;

        if (!user || !user.id || !id) {
            res.status(400).json({ message: 'Invalid request' });
            return;
        }

        const notification = await prisma.notification.findUnique({
            where: { id }
        });

        if (!notification || notification.userId !== user.id) {
            res.status(404).json({ message: 'Notification not found' });
            return;
        }

        const updated = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        res.status(200).json({ message: 'Marked as read', notification: updated });
    } catch (error) {
        console.error('Mark notification as read error:', error);
        res.status(500).json({ message: 'Server error while updating notification' });
    }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsReadController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user || !user.id) {
            res.status(400).json({ message: 'Invalid request' });
            return;
        }

        await prisma.notification.updateMany({
            where: {
                userId: user.id,
                isRead: false
            },
            data: { isRead: true }
        });

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        res.status(500).json({ message: 'Server error while updating notifications' });
    }
};
