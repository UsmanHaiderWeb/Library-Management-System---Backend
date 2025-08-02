/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';

export const getAllBooksController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        const { pageNumber, searchQuery } = (req as any).query as { pageNumber: number, searchQuery: string };

        // find whereClause to pass to prisma
        const whereClause: any = {
            collegeId: admin.collegeId,
        };

        if (searchQuery.trim() !== '') {
            whereClause.OR = [
                { bookNumber: { contains: searchQuery } },
                { bookName: { contains: searchQuery } },
                { genre: { contains: searchQuery } },
                { author: { contains: searchQuery } },
            ];
        }

        const booksCount = await prisma.book.count({
            where: whereClause,
        });

        const books = await prisma.book.findMany({
            where: whereClause,
            skip: (pageNumber || 0) * 20,
            take: 20,
            select: {
                id: true,
                bookNumber: true,
                bookName: true,
                author: true,
                createdAt: true,
                genre: true,
                almirahNumber: true,
                shelfNumber: true,
                image: true,
                totalBooks: true,
                _count: {
                    select: {
                        BorrowedRequests: true,
                        copies: {
                            where: {
                                isBorrowed: false
                            }
                        }
                    }
                }
            }
        });

        res.status(201).json({ books, totalPages: Math.ceil(booksCount / 20) })
    } catch (error) {
        console.error('get all books error:', error);
        res.status(500).json({ message: 'Server error' });
    }
    return;
};