import express from 'express';
import { verifyToken } from '../../helpers/verifyToken';
import { userJwtPayload } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';
import { redisClient } from '../../helpers/redisClient';
import { VerificationToken } from '@prisma/client';
import jwt from 'jsonwebtoken';
import logger from '../../helpers/logger';
import { devOtpCode } from '../../config';

export const verifyEmailController = async (req: express.Request, res: express.Response): Promise<void> => {
    try {
        const { verificationCode } = req.body;
        const token = req.headers.authorization?.split('Bearer ')[1];

        if (!token) {
            res.status(401).json({
                message: 'Authentication token is required'
            });
            return;
        }


        // Verify the JWT token and get user ID
        const decodedUserData = verifyToken(token) as userJwtPayload;
        if (!decodedUserData || !decodedUserData.userId || !decodedUserData.email || !decodedUserData.collegeCode) {
            res.status(401).json({
                message: 'Invalid or expired token'
            });
            return;
        }

        
        if (!verificationCode || verificationCode.length !== 6) {
            res.status(400).json({
                message: 'Please provide a valid 6-digit verification code'
            });
            return;
        }


        // Development escape hatch: a fixed code that verifies any account, so
        // local work and demos are not blocked on a working mail server. Needs
        // DEV_OTP_CODE set *and* NODE_ENV=development -- see devOtpCode().
        const devCode = devOtpCode();
        const usingDevCode = devCode !== null && verificationCode === devCode;
        if (usingDevCode) {
            logger.warn(
                `DEV_OTP_CODE accepted for ${decodedUserData.email}. This must never be set in production.`,
            );
        }

        // Find the verification token in redis or in the database (if not present in redis)
        let verificationCodeFromDB: VerificationToken | null = null;
        const verificationCodeDocumentFromRedis = usingDevCode
            ? { code: '', id: '' }
            : await redisClient.hgetall(`user:${decodedUserData.userId}:code`);

        if(!usingDevCode && (!verificationCodeDocumentFromRedis.code || !verificationCodeDocumentFromRedis.id || (verificationCodeDocumentFromRedis.code != verificationCode))){
            verificationCodeFromDB = await prisma.verificationToken.findFirst({
                where: {
                    userId: decodedUserData.userId,
                    token: verificationCode,
                    type: 'EMAIL_VERIFICATION',
                    expiresAt: {
                        gt: new Date() // Check if token hasn't expired
                    }
                }
            });


            if (!verificationCodeFromDB) {
                res.status(400).json({
                    message: 'Invalid or expired verification code'
                });
                return;
            }
        }


        // Database writes only — cache updates and the response happen after the
        // commit so a Redis hiccup can never roll back a verified account (or
        // fire a second response on an already-answered request).
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: {
                    id: decodedUserData.userId
                },
                data: {
                    isEmailVerified: true
                }
            });

            // Delete the used verification token. The dev code is not a
            // stored token, so there is nothing to consume.
            const usedTokenId = verificationCodeDocumentFromRedis.id || verificationCodeFromDB?.id;
            if (usedTokenId) {
                await tx.verificationToken.delete({
                    where: {
                        id: usedTokenId,
                        userId: decodedUserData.userId
                    }
                });
            }
        });

        // create new access token
        const accessToken = jwt.sign(
            {
                userId: decodedUserData.userId,
                email: decodedUserData.email,
                collegeCode: decodedUserData.collegeCode,
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        try {
            await redisClient.del(`user:${decodedUserData.userId}:code`);
            await redisClient.set(`user:${decodedUserData.userId}:token`, accessToken);
        } catch (cacheError) {
            logger.error('Failed to update verification cache:', cacheError);
        }

        res.status(200).json({
            message: 'Email verified successfully',
            accessToken
        });
    } catch (error) {
        logger.error('Error in verifyEmailController:', error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
    return;
}; 