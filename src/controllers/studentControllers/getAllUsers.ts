/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';

export const getAllUsersController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        const { pageNumber, searchQuery } = (req as any).query as {pageNumber: number, searchQuery: string};

        // find whereClause to pass to prisma
        const whereClause: any = {
            collegeId: admin.collegeId,
        };
        
        if (searchQuery.trim() !== '') {
            whereClause.OR = [
                { name: { contains: searchQuery } },
                { email: { contains: searchQuery } },
                { studentId: { contains: searchQuery } },
            ];
        }

        const usersCount = await prisma.user.count({
            where: whereClause
        });

        const users = await prisma.user.findMany({
            where: whereClause,
            skip: (pageNumber || 0) * 20,
            take: 20,
            select: {
                id: true,
                name: true,
                studentId: true,
                email: true,
                phoneNumber: true,
                isEmailVerified: true,
                // batchYear: true,
                createdAt: true,
                _count: {
                    select: {
                        borrowedBooks: true,
                        borrowedRequests: true
                    }
                }
            }
        });

        res.status(201).json({users, totalPages: Math.ceil(usersCount / 20)});
        return;
    } catch (error) {
        console.error('get all users error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};