/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { AuthService } from '../../services/auth.service';

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
        console.error('request reset error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const resetPasswordController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, otp, newPassword, type } = req.body;

        if (!email || !otp || !newPassword || !type) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        const result = await AuthService.resetPassword({ email, otp, newPassword, type });
        res.status(200).json(result);
    } catch (error: any) {
        if (error.message === 'Invalid or expired OTP') {
            res.status(400).json({ message: error.message });
            return;
        }
        console.error('reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
