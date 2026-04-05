/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AdminService } from '../../services/admin.service';
import logger from '../../helpers/logger';

// Signup controller
export const adminSignupController = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        const { email, password, name, collegeCode } = req.body;

        const { token } = await AdminService.signup({ email, password, name, collegeCode });

        res.status(201).json({
            message: 'Admin created successfully',
            token,
        });

    } catch (error: any) {
        if (error.message === 'Invalid college code.' || error.message === 'Admin already exists') {
            res.status(400).json({ message: error.message });
            return;
        }
        logger.error('Admin Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
