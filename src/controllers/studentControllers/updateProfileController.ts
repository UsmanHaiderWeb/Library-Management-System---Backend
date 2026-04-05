/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { prisma } from '../../helpers/prismaDb';
import logger from '../../helpers/logger';

export const updateProfileController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { name, phoneNumber } = req.body;

        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!name && !phoneNumber) {
            res.status(400).json({ message: 'No fields to update' });
            return;
        }

        const dataToUpdate: any = {};
        if (name) dataToUpdate.name = name;
        if (phoneNumber) dataToUpdate.phoneNumber = phoneNumber;

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: dataToUpdate,
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                email: true,
            }
        });

        res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
        logger.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
