/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../helpers/prismaDb';

export const changePasswordController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { currentPassword, newPassword } = req.body;

        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        if (!currentPassword || !newPassword) {
            res.status(400).json({ message: 'Current and new passwords are required' });
            return;
        }

        const userRecord = await prisma.user.findUnique({
            where: { id: user.id }
        });

        if (!userRecord) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const isMatch = await bcrypt.compare(currentPassword, userRecord.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Incorrect current password' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: user.id },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
