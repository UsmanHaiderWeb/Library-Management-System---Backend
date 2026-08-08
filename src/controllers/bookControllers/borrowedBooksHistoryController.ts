/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, response, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { prisma } from "../../helpers/prismaDb";
import { getDateRangeQuery } from "../../helpers/dateUtils";
import logger from '../../helpers/logger';

export const borrowedBooksHistoryController = async (req: Request, res: Response) => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { pageNumber, searchQuery, fromDate, toDate } = (req as any).query as { pageNumber: number, searchQuery: string, fromDate?: string, toDate?: string };

        // find whereClause to pass to prisma
        const whereClause: any = {
            collegeId: admin.collegeId,
            status: "returned"
        };

        const dateCondition = getDateRangeQuery(fromDate, toDate);
        if (dateCondition) {
            whereClause.returnedOn = dateCondition;
        }

        if (searchQuery?.trim() !== '') {
            whereClause.OR = [
                {
                    user: {
                        OR: [
                            { name: { contains: searchQuery } },
                            { studentId: { contains: searchQuery } },
                        ],
                    },
                },
                {
                    bookCopy: {
                        book: {
                            OR: [
                                { bookName: { contains: searchQuery } },
                                { bookNumber: { contains: searchQuery } },
                            ],
                        },
                    },
                },
            ];
        }

        const totalBorrowedBooksCount = await prisma.borrowedBook.count({
            where: whereClause
        });

        if (!totalBorrowedBooksCount) {
            res.status(200).json({ borrowedBooks: [], totalPages: 0 })
            return;
        }

        const borrowedBooks = await prisma.borrowedBook.findMany({
            where: whereClause,
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        studentId: true,
                    }
                },
                bookCopy: {
                    select: {
                        book: {
                            select: {
                                id: true,
                                bookNumber: true,
                                bookName: true,
                            }
                        },
                    }
                },
                borrowedOn: true,
                status: true,
                dueDate: true,
                returnedOn: true,
            },
            skip: (pageNumber || 0) * 20,
            take: 20,
        })

        res.json({ borrowedBooks, totalPages: Math.ceil(totalBorrowedBooksCount / 20) })
    } catch (error) {
        logger.info("Controller all borrowed books error:", error);
        response.status(500).json({ message: "Internal Server Error." })
    }
    return;
}