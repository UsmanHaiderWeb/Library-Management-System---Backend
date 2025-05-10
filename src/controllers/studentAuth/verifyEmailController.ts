import express from 'express';
import { verifyToken } from '../../helpers/verifyToken';
import { userJwtPayload } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';

export const verifyEmailController = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
        const { verificationCode } = req.body;
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            res.status(401).json({
                message: 'Authentication token is required'
            });
            return;
        }

        if (!verificationCode || verificationCode.length !== 6) {
            res.status(400).json({
                message: 'Please provide a valid 6-digit verification code'
            });
            return;
        }

        // Verify the JWT token and get user ID
        const decoded = verifyToken(token) as userJwtPayload;
        if (!decoded || !decoded.userId || !decoded.email || !decoded.collegeCode) {
            res.status(401).json({
                message: 'Invalid or expired token'
            });
            return;
        }

        // Find the verification token in the database
        const verificationToken = await prisma.verificationToken.findFirst({
            where: {
                userId: decoded.userId,
                token: verificationCode,
                type: 'EMAIL_VERIFICATION',
                expiresAt: {
                    gt: new Date() // Check if token hasn't expired
                }
            }
        });

        if (!verificationToken) {
            res.status(400).json({
                message: 'Invalid or expired verification code'
            });
            return;
        }

        await prisma.$transaction(async (prisma) => {
            // Update user's email verification status
            await prisma.user.update({
                where: {
                    id: decoded.userId
                },
                data: {
                    isEmailVerified: true
                }
            });

            // Delete the used verification token
            await prisma.verificationToken.delete({
                where: {
                    id: verificationToken.id
                }
            });
        })

        res.status(200).json({
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('Error in verifyEmailController:', error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
    return;
}; 