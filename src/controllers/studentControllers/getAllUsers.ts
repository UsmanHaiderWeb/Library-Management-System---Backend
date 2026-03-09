import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { UserService } from '../../services/user.service';

export const getAllUsersController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const {
            pageNumber,
            searchQuery,
            isEmailVerified,
            isVerifiedByAdmin,
            hasActiveBorrows
        } = req.query as any;

        const result = await UserService.getAllUsers({
            collegeId: admin.collegeId,
            pageNumber: parseInt(pageNumber) || 0,
            searchQuery: searchQuery || '',
            isEmailVerified: isEmailVerified === 'true' ? true : isEmailVerified === 'false' ? false : undefined,
            isVerifiedByAdmin: isVerifiedByAdmin === 'true' ? true : isVerifiedByAdmin === 'false' ? false : undefined,
            hasActiveBorrows: hasActiveBorrows === 'true'
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('get all users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};