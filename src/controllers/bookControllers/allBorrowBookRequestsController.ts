/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, response, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { prisma } from "../../helpers/prismaDb";

export const allBorrowBookRequestsController = async (req: Request, res: Response) => {
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
                            OR: [
                                { name: { contains: searchQuery } },
                                { studentId: { contains: searchQuery } },
                            ],
                    },
                },
                {
                    book: {
                        is: {
                            OR: [
                                { bookNumber: { contains: searchQuery } },
                                { bookName: { contains: searchQuery } },
                            ],
                        },
                    },
                },
            ];
        }

        const totalRequestCount = await prisma.borrowedRequests.count({
            where: whereClause
        });
        if (!totalRequestCount) {
            res.status(201).json({ requests: [], totalPages: 0 })
            return;
        }

        const requests = await prisma.borrowedRequests.findMany({
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
                book: {
                    select: {
                        id: true,
                        bookNumber: true,
                        bookName: true,
                        author: true,
                        genre: true,
                    }
                },
                requestedOn: true,
                status: true,
            },
            skip: (pageNumber || 0) * 20,
            take: 20,
        })

        res.json({ requests, totalPages: Math.ceil(totalRequestCount / 20) })
    } catch (error) {
        console.log("Controller all borrow book requests error:", error);
        response.status(500).json({ message: "Internal Server Error." })
    }
    return;
}