/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AdminService } from '../../services/admin.service';
import { RequestWithAdmin } from '../../helpers/interfaces';
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

        // An admin already signed in may add a colleague; the open route may
        // only ever create the first one. adminAuthMiddleware is optional on
        // this route, so req.admin is set when a valid token was supplied.
        const actingAdmin = (req as RequestWithAdmin).admin;

        const { token } = await AdminService.signup(
            { email, password, name, collegeCode },
            Boolean(actingAdmin),
        );

        res.status(201).json({
            message: 'Admin created successfully',
            token,
        });

    } catch (error: any) {
        if (error.message === 'Admin signup is closed') {
            res.status(403).json({
                message: 'This library already has an administrator. Ask them to create your account.',
            });
            return;
        }
        if (error.message === 'Invalid college code.' || error.message === 'Admin already exists') {
            res.status(400).json({ message: error.message });
            return;
        }
        logger.error('Admin Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
