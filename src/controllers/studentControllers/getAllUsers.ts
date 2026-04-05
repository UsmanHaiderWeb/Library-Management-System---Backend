import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { UserService } from '../../services/user.service';
import { UserRole } from '@prisma/client';
import logger from '../../helpers/logger';

export const getAllUsersController = async (req: Request, res: Response) => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { page, search, isEmailVerified, isVerifiedByAdmin, hasActiveBorrows, role } = req.query;

        const result = await UserService.getAllUsers({
            collegeId: admin.collegeId,
            pageNumber: page ? parseInt(page as string) : 0,
            searchQuery: search as string,
            isEmailVerified: isEmailVerified === 'true' ? true : isEmailVerified === 'false' ? false : undefined,
            isVerifiedByAdmin: isVerifiedByAdmin === 'true' ? true : isVerifiedByAdmin === 'false' ? false : undefined,
            hasActiveBorrows: hasActiveBorrows === 'true',
            role: role as UserRole,
        });

        res.json(result);
    } catch (error) {
        logger.error('get all users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};