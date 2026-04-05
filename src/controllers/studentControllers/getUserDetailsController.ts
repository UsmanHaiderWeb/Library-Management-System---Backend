/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { UserService } from '../../services/user.service';
import logger from '../../helpers/logger';

export const getUserDetailsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user || !user.id) {
            res.status(400).json({ message: 'User not found in request' });
            return;
        }

        const data = await UserService.getUserDetails(user.id);

        if (!data) {
            res.status(404).json({ message: 'User details not found' });
            return;
        }

        res.status(200).json(data);
    } catch (error) {
        logger.error('get user details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};