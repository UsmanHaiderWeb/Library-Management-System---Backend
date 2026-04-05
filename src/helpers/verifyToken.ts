import jwt from 'jsonwebtoken';
import { adminJwtPayload, userJwtPayload } from './interfaces';
import logger from './logger';

export const verifyToken = (token: string): userJwtPayload | adminJwtPayload | null => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as userJwtPayload;
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) logger.info("Token Expired.")
        return null;
    }
};
