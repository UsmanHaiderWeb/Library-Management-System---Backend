import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';
import { redisClient } from '../../helpers/redisClient';
import logger from '../../helpers/logger';

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
        logger.error('get account requests error:', error);
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
        logger.error('approve account error:', error);
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
        logger.error('deny account error:', error);
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
        logger.error('get user details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Marks a student's email address verified without them entering a code.
 *
 * There are two separate gates on a new account: the student proves the email
 * is theirs, and a librarian approves the person. This covers the first one
 * when the code cannot get through -- a mistyped address, a school mail server
 * eating it, or a student who simply cannot receive it. Without this the only
 * remedy was editing the database by hand.
 *
 * It is deliberately not the same action as approving the account: a librarian
 * vouching for someone in person is a different judgement from confirming an
 * inbox, and the audit log records them separately.
 */
export const verifyStudentEmailController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId, collegeId: admin.collegeId },
            select: { id: true, isEmailVerified: true, email: true },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isEmailVerified) {
            res.status(400).json({ message: 'This email is already verified' });
            return;
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { isEmailVerified: true },
            });
            // Any outstanding codes are now meaningless
            await tx.verificationToken.deleteMany({
                where: { userId, type: 'EMAIL_VERIFICATION' },
            });
        });

        // After the commit: the cached auth payload carries isEmailVerified,
        // so a stale entry would keep the student locked out of borrowing for
        // up to a week.
        try {
            await redisClient.del(`user:${userId}:data`);
            await redisClient.del(`user:${userId}:code`);
        } catch (cacheError) {
            logger.error('Failed to clear user cache after manual verification:', cacheError);
        }

        await NotificationService.createNotification(
            userId,
            'Email Verified',
            'A librarian has confirmed your email address for you. You no longer need to enter a verification code.',
        );

        logger.info(`Admin ${admin.id} manually verified the email for ${user.email}`);
        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        logger.error('verify student email error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
