/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';

export const getUserDetailsController = async (req: Request, res: Response): Promise<void> => {
    try {
        res.status(201).json({user: (req as any).user});
        return;
    } catch (error) {
        console.error('get user details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}; 