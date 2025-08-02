/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, response, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { prisma } from "../../helpers/prismaDb";

export const allBorrowBooksController = async (req: Request, res: Response) => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { pageNumber, searchQuery } = (req as any).query as { pageNumber: number, searchQuery: string };

        // find whereClause to pass to prisma
        const whereClause: any = {
            collegeId: admin.collegeId,
        };

        if (searchQuery?.trim() !== '') {
            whereClause.OR = [
                {
                    user: {
                        is: {
                            OR: [
                                { name: { contains: searchQuery } },
                                { studentId: { contains: searchQuery } },
                            ],
                        },
                    },
                },
                {
                    bookCopy: {
                        is: {
                            OR: [
                                {
                                    book: {
                                        is: {
                                            OR: [
                                                { name: { contains: searchQuery } },
                                                { studentId: { contains: searchQuery } },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            ];
        }

        const totalRequestCount = await prisma.borrowedBook.count({
            where: whereClause
        });
        if (!totalRequestCount) {
            res.status(201).json({ requests: [], totalPages: 0 })
            return;
        }

        const requests = await prisma.borrowedBook.findMany({
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

        res.json({ requests, totalPages: Math.ceil(totalRequestCount / 20) })
    } catch (error) {
        console.log("Controller all borrowed books error:", error);
        response.status(500).json({ message: "Internal Server Error." })
    }
    return;
}