import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { prisma } from '../../helpers/prismaDb';
import { redisClient } from '../../helpers/redisClient';
import logger from '../../helpers/logger';
import { EmailService } from '../../services/email.service';

// Login controller
export const loginController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, password } = req.body;

        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                College: true
            }
        });

        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }


        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                collegeCode: user.College?.code,
                isEmailVerified: user?.isEmailVerified
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '2h' }
        );


        // check: does the email of the user is validated
        if (!user.isEmailVerified) {
            // generate an otp code and email the code to the user
            const code = Math.floor(Math.random() * 900000) + 100000 as number;

            // add the code to the database
            const generatedVerificationCodeDocument = await prisma.verificationToken.create({
                data: {
                    token: code.toString(),
                    type: 'EMAIL_VERIFICATION',
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
                }
            })

            // store the token in redis
            await redisClient.hset(`user:${user.id}:code`, {
                code: code.toString(),
                id: generatedVerificationCodeDocument.id
            });
            await redisClient.expire(`user:${user.id}:code`, 60 * 60 * 2);

            // The code was generated and stored above but never actually sent
            // -- the response claimed an email had gone out while nothing had.
            // Fire-and-forget so a dead mail server cannot delay or fail the
            // login; "resend code" is the fallback when it never arrives.
            EmailService.sendVerificationCode(user.email, code.toString())
                .catch((emailError) => logger.error('Verification email failed on login:', emailError));

            // send the response
            res.status(200).json({
                message: 'Your email is not verified yet. We have sent you a verification code.',
                temporaryToken: token
            });
            return;
        }

        // store the token in redis
        await redisClient.set(`user:${user.id}:token`, token, 'EX', 60 * 60 * 24 * 7);


        // send the response
        res.status(201).json({
            message: 'Login successful',
            token,
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 