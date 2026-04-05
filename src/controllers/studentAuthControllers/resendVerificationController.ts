import { Request, Response } from 'express';
import { verifyToken } from '../../helpers/verifyToken';
import { userJwtPayload } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';
import { redisClient } from '../../helpers/redisClient';
import { EmailService } from '../../services/email.service';
import logger from '../../helpers/logger';

export const resendVerificationCodeController = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.headers.authorization?.split('Bearer ')[1];

        if (!token) {
            res.status(401).json({ message: 'Authentication token is required' });
            return;
        }

        const decoded = verifyToken(token) as userJwtPayload;
        if (!decoded || !decoded.userId || !decoded.email) {
            res.status(401).json({ message: 'Invalid or expired token' });
            return;
        }

        // Check if user exists and is not already verified
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isEmailVerified) {
            res.status(400).json({ message: 'Email is already verified' });
            return;
        }

        // Rate limit: check if a code was sent recently (within last 60 seconds)
        const existingCode = await redisClient.hgetall(`user:${decoded.userId}:code`);
        const ttl = await redisClient.ttl(`user:${decoded.userId}:code`);
        const codeMaxTTL = 60 * 60 * 2; // 2 hours
        if (existingCode.code && ttl > codeMaxTTL - 60) {
            res.status(429).json({ message: 'Please wait at least 60 seconds before requesting a new code' });
            return;
        }

        // Delete old verification tokens for this user
        await prisma.verificationToken.deleteMany({
            where: { userId: decoded.userId, type: 'EMAIL_VERIFICATION' },
        });
        await redisClient.del(`user:${decoded.userId}:code`);

        // Generate new code
        const code = Math.floor(Math.random() * 900000) + 100000;

        // Store in DB
        const verificationDoc = await prisma.verificationToken.create({
            data: {
                token: code.toString(),
                type: 'EMAIL_VERIFICATION',
                userId: decoded.userId,
                expiresAt: new Date(Date.now() + 60 * 60 * 2 * 1000),
            },
        });

        // Store in Redis
        await redisClient.hset(`user:${decoded.userId}:code`, {
            code: code.toString(),
            id: verificationDoc.id,
        });
        await redisClient.expire(`user:${decoded.userId}:code`, 60 * 60 * 2);

        // Send email
        await EmailService.sendVerificationCode(decoded.email, code.toString());

        res.status(200).json({ message: 'Verification code resent successfully' });
    } catch (error) {
        logger.error('Resend verification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
