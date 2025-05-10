import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { prisma } from '../../helpers/prismaDb';

// Login controller
export const adminLoginController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, password } = req.body;

        // Find admin
        const admin = await prisma.admin.findUnique({
            where: { email },
            include: {
                College: true
            }
        });

        if (!admin) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        // Check password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                collegeCode: admin.College?.code,
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Admin Login successful',
            token,
        });
    } catch (error) {
        console.error('Admin Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 