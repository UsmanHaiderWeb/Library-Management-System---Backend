/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { prisma } from '../../helpers/prismaDb';

/**
 * Get Notification Preferences
 */
export const getNotificationPreferencesController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user || !user.id) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        let preferences = await prisma.notificationPreference.findUnique({
            where: { userId: user.id }
        });

        // Create defaults if not exists
        if (!preferences) {
            preferences = await prisma.notificationPreference.create({
                data: { userId: user.id }
            });
        }

        res.status(200).json({ preferences });
    } catch (error) {
        console.error('Get notification preferences error:', error);
        res.status(500).json({ message: 'Server error while fetching notification preferences' });
    }
};

/**
 * Update Notification Preferences
 */
export const updateNotificationPreferencesController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user || !user.id) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const allowedFields = [
            'emailBorrowStatus', 'emailDueReminder', 'emailOverdue',
            'emailReservation', 'emailRenewal', 'emailPurchase',
            'inAppBorrowStatus', 'inAppDueReminder', 'inAppOverdue',
            'inAppReservation', 'inAppRenewal', 'inAppPurchase'
        ];

        const updateData: Record<string, boolean> = {};
        for (const field of allowedFields) {
            if (typeof req.body[field] === 'boolean') {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ message: 'No valid preferences provided' });
            return;
        }

        const preferences = await prisma.notificationPreference.upsert({
            where: { userId: user.id },
            update: updateData,
            create: { userId: user.id, ...updateData }
        });

        res.status(200).json({ message: 'Preferences updated', preferences });
    } catch (error) {
        console.error('Update notification preferences error:', error);
        res.status(500).json({ message: 'Server error while updating notification preferences' });
    }
};
