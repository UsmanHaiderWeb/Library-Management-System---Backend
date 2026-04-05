import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';

export const getAllAccountRequestsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { pageNumber, searchQuery } = req.query as { pageNumber?: string; searchQuery?: string };

        const result = await UserService.getAllUsers({
            collegeId: admin.collegeId,
            pageNumber: parseInt(pageNumber || '0'),
            searchQuery: searchQuery || '',
            isVerifiedByAdmin: false,
            isEmailVerified: true,
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('get account requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const approveAccountController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId, collegeId: admin.collegeId },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isVerifiedByAdmin) {
            res.status(400).json({ message: 'User is already verified' });
            return;
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isVerifiedByAdmin: true },
        });

        await NotificationService.createNotification(
            userId,
            'Account Approved',
            'Your account has been verified by the admin. You now have full access to library services.'
        );

        res.status(200).json({ message: 'Account approved successfully' });
    } catch (error) {
        console.error('approve account error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const denyAccountController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId, collegeId: admin.collegeId },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // Delete related records first, then the user
        await prisma.$transaction([
            prisma.verificationToken.deleteMany({ where: { userId } }),
            prisma.ipAddressess.deleteMany({ where: { userId } }),
            prisma.notification.deleteMany({ where: { userId } }),
            prisma.savedBook.deleteMany({ where: { userId } }),
            prisma.review.deleteMany({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } }),
        ]);

        res.status(200).json({ message: 'Account denied and removed successfully' });
    } catch (error) {
        console.error('deny account error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getAdminUserDetailsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { userId } = req.params;

        const result = await UserService.getUserDetails(userId);

        if (!result || !result.user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (result.user.collegeId !== admin.collegeId) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        res.status(200).json(result);
    } catch (error) {
        console.error('get user details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
