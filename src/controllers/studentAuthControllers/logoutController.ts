/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { redisClient } from '../../helpers/redisClient';
import logger from '../../helpers/logger';

export const logoutController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        if (user && user.id) {
            // Remove the token from redis
            await redisClient.del(`user:${user.id}:token`);
        }
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({ message: 'Server error during logout' });
    }
};
