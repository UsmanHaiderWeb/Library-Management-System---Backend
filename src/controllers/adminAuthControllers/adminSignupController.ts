import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { prisma } from '../../helpers/prismaDb';

interface signupBody {
    email: string,
    password: string,
    name: string,
    collegeCode: string
}


// Signup controller
export const adminSignupController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, password, name, collegeCode }: signupBody = req.body;

        // Check if college exists
        const college = await prisma.college.findUnique({
            where: { code: collegeCode }
        });

        if (!college) {
            res.status(400).json({ message: 'Invalid college code.' });
            return;
        }

        // Check if admin already exists
        const existingUser = await prisma.admin.findUnique({
            where: { email }
        });

        if (existingUser) {
            res.status(400).json({ message: 'Admin already exists' });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await prisma.$transaction(async (prisma) => {
            // Create admin
            const user = await prisma.admin.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    collegeId: college.id
                }
            });
    
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    collegeCode: college.code
                },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '1h' }
            );

            // send the response back to frontend
            res.status(201).json({
                message: 'Admin created successfully',
                token,
            });
        })

        return;
    } catch (error) {
        console.error('Admin Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};