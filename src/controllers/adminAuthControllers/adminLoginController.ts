/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AdminService } from '../../services/admin.service';

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

        const { token } = await AdminService.login({ email, password });

        res.json({
            message: 'Admin Login successful',
            token,
        });
    } catch (error: any) {
        if (error.message === 'Invalid credentials') {
            res.status(400).json({ message: error.message });
            return;
        }
        console.error('Admin Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};