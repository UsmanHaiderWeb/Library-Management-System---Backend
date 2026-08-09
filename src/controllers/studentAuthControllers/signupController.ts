import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { prisma } from '../../helpers/prismaDb';
import { redisClient } from '../../helpers/redisClient';
import { EmailService } from '../../services/email.service';
import logger from '../../helpers/logger';

interface signupBody {
    email: string,
    password: string,
    name: string,
    studentId: string,
    phoneNumber: string,
    collegeCode: string
}


// Signup controller
export const signupController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, password, name, studentId, phoneNumber, collegeCode }: signupBody = req.body;

        // Check if college exists
        const college = await prisma.college.findUnique({
            where: { code: collegeCode }
        });

        if (!college) {
            res.status(400).json({ message: 'Invalid college code.' });
            return;
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const getYear = () => {
            const date = new Date();
            return date.getFullYear();
        };

        const code = (Math.floor(Math.random() * 900000) + 100000).toString();

        // Only database writes belong inside the transaction. SMTP and Redis are
        // side effects: an interactive transaction times out after 5s, so a slow
        // or unreachable mail server used to roll the account back *after* the
        // success response had already been sent — the student was told signup
        // worked when no account existed.
        const { user, verificationTokenId } = await prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    studentId,
                    batchYear: getYear(),
                    phoneNumber,
                    isEmailVerified: false,
                    isVerifiedByAdmin: false,
                    collegeId: college.id
                }
            });

            const verificationToken = await tx.verificationToken.create({
                data: {
                    token: code,
                    type: 'EMAIL_VERIFICATION',
                    userId: createdUser.id,
                    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
                }
            });

            return { user: createdUser, verificationTokenId: verificationToken.id };
        });

        // Token proving the person entering the OTP is the one who signed up
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                collegeCode: college.code
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        // Cache for fast OTP lookup; the DB row above is the source of truth,
        // so a Redis outage must not fail the signup.
        try {
            await redisClient.hset(`user:${user.id}:code`, {
                code,
                id: verificationTokenId
            });
            await redisClient.expire(`user:${user.id}:code`, 60 * 60 * 2);
        } catch (cacheError) {
            logger.error('Failed to cache verification code:', cacheError);
        }

        // Fire-and-forget: a dead mail server must not delay or fail the
        // response. If it never arrives the student can use "resend code".
        EmailService.sendVerificationCode(email, code)
            .catch((emailError) => logger.error('Verification email failed:', emailError));

        res.status(201).json({
            message: 'User created successfully. Verification email sent.',
            temporaryToken: token,
        });
        return;
    } catch (error) {
        logger.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};