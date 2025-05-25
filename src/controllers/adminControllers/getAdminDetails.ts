/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';

export const getAdminDetailsController = async (req: Request, res: Response): Promise<void> => {
    try {
        res.status(201).json({admin: (req as any).admin});
        return;
    } catch (error) {
        console.error('get admin details error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
}; 