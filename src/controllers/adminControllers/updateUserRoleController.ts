/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { UserService } from '../../services/user.service';
import { UserRole } from '@prisma/client';
import logger from '../../helpers/logger';

/**
 * Update a student's role (Admin only)
 */
export const updateUserRoleController = async (req: Request, res: Response) => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { userId } = req.params;
        const { role } = req.body;

        if (!Object.values(UserRole).includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const updatedUser = await UserService.updateUserRole(userId, role as UserRole, admin.collegeId);
        
        res.json({
            message: `User role updated to ${role} successfully`,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                role: updatedUser.role
            }
        });
    } catch (error: any) {
        logger.error('update user role error:', error);
        res.status(error.message === 'User not found' ? 404 : 500)
           .json({ message: error.message || 'Server error' });
    }
};
