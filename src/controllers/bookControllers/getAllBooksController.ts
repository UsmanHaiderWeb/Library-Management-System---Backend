/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';

export const getAllBooksController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        const { pagNumber } = (req as any).query;

        const booksCount = await prisma.book.count();
        const books = await prisma.book.findMany({
            where: {
                collegeId: admin.collegeId,
            },
            skip: (pagNumber || 0) * 20,
            take: 20,
            select: {
                id: true,
                bookNumber: true,
                bookName: true,
                author: true,
                BorrowedRequests: true,
                createdAt: true,
                genre: true,
                almirahNumber: true,
                shelfNumber: true,
                image: true,
                totalBooks: true,
                copies: {
                    where: {
                        isBorrowed: true,
                    },
                    select: {
                        _count: true,
                    }
                }
            }
        });

        res.json({books, totalPages: Math.ceil(booksCount / 20)})
        return;
    } catch (error) {
        console.error('get all books error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};