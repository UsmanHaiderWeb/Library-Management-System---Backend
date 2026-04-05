/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service';
import logger from '../../helpers/logger';

export const requestPasswordResetController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, type } = req.body; // type: 'user' | 'admin'

        if (!email || !type) {
            res.status(400).json({ message: 'Email and type are required' });
            return;
        }

        const result = await AuthService.requestPasswordReset(email, type);
        res.status(200).json(result);
    } catch (error: any) {
        if (error.message === 'User not found') {
            res.status(404).json({ message: error.message });
            return;
        }
        if (error.message.includes('rate limit') || error.message.includes('maximum number of password reset attempts')) {
            res.status(429).json({ message: error.message });
            return;
        }
        logger.error('request reset error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, token, newPassword, type } = req.body;

        // Backend will accept token but we might have also legacy otp. We'll map otp to token just in case.
        const resetToken = token || req.body.otp;

        if (!email || !resetToken || !newPassword || !type) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        const result = await AuthService.resetPassword({ email, token: resetToken, newPassword, type });
        res.status(200).json(result);
    } catch (error: any) {
        if (error.message === 'Invalid or expired reset token') {
            res.status(400).json({ message: error.message });
            return;
        }
        logger.error('reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
