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

        await prisma.$transaction(async (prisma) => {
            // Create user
            const user = await prisma.user.create({
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

            // Generate JWT token to verify that the user who enters the otp is the actual user
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    collegeCode: college.code
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );

            // generate an otp code and email the code to the user
            const code = Math.floor(Math.random() * 900000) + 100000 as number;

            // add the code to the database
            const generatedVerificationCodeDocument = await prisma.verificationToken.create({
                data: {
                    token: code.toString(),
                    type: 'EMAIL_VERIFICATION',
                    userId: user.id,
                    expiresAt: new Date(Date.now() + (60 * 60 * 2))
                }
            })

            // store the token and code in redis
            // await redisClient.set(`user:${user.id}:token`, code.toString(), 'EX', 60 * 60 * 2);
            await redisClient.hset(`user:${user.id}:code`, {
                code: code.toString(),
                id: generatedVerificationCodeDocument.id
            });
            await redisClient.expire(`user:${user.id}:code`, 60 * 60 * 2);


            // send the verification email
            await EmailService.sendVerificationCode(email, code.toString());

            // send the response back to frontend
            res.status(201).json({
                message: 'User created successfully. Verification email sent.',
                temporaryToken: token,
            });
        });

        return;
    } catch (error) {
        logger.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};