/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { prisma } from "../../helpers/prismaDb";
import { redisClient } from "../../helpers/redisClient";

export const changeStatusForBorrowBookRequestController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        const { borrowRequestId } = (req as any).params;
        if (!borrowRequestId) {
            res.status(400).json({ message: "Please provide request ID." })
        }

        const { status } = (req as any).body;
        if (!status || (status != 'rejected' && status != 'accepted')) {
            res.status(400).json({ message: "Please provide request status." })
        }

        const borrowRequest = await prisma.borrowedRequests.findUnique({
            where: {
                id: borrowRequestId,
                collegeId: admin.collegeId,
                status: 'pending',
            },
            select: {
                id: true,
                userId: true,
                bookId: true,
            }
        })
        if (!borrowRequest) {
            res.status(400).json({ message: "Borrow request not found or already processed." })
            return;
        }


        if (status == 'rejected') {
            await prisma.borrowedRequests.update({
                where: {
                    id: borrowRequest.id,
                    userId: borrowRequest.userId,
                    collegeId: admin.collegeId
                },
                data: {
                    status
                }
            })

            res.status(201).json({
                message: "Borrow book request has been rejected successfully.",
                status,
            });
            return;
        }


        // Try to get borrowed books count from Redis first
        const redisKey = `user:${borrowRequest.userId}:borrowedBooks`;
        let currentBorrowedBooks: any = await redisClient.get(redisKey);

        // If not in Redis, get from database and cache it
        if (!currentBorrowedBooks || currentBorrowedBooks == 0) {
            currentBorrowedBooks = await prisma.borrowedBook.count({
                where: {
                    userId: borrowRequest.userId,
                    status: 'borrowed'
                }
            });

            // Cache for 1 hour
            await redisClient.set(redisKey, currentBorrowedBooks, 'EX', 3600);
        } else {
            currentBorrowedBooks = parseInt(currentBorrowedBooks);
        }

        if (currentBorrowedBooks >= 2) {
            res.status(400).json({
                message: 'User has already borrowed the maximum number of books (2). Please return a book before borrowing another one.'
            });
            return;
        }

        const availableBookCopy = await prisma.bookCopy.findFirst({
            where: {
                isBorrowed: false,
                bookId: borrowRequest.bookId,
            },
            select: {
                id: true
            }
        })

        if (!availableBookCopy) {
            res.status(404).json({ message: 'No copy for this book is available' });
            return;
        }


        await prisma.$transaction(async (tx) => {
            await tx.borrowedRequests.update({
                where: {
                    id: borrowRequest.id,
                    userId: borrowRequest.userId,
                    collegeId: admin.collegeId
                },
                data: {
                    status: "accepted"
                }
            })


            await tx.bookCopy.update({
                where: {
                    id: availableBookCopy.id,
                    bookId: borrowRequest.bookId,
                    isBorrowed: false
                },
                data: {
                    isBorrowed: true
                }
            })


            await tx.borrowedBook.create({
                data: {
                    status: 'borrowed',
                    bookCopyId: availableBookCopy.id,
                    userId: borrowRequest.userId,
                    collegeId: admin.collegeId,
                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                },
                select: {
                    id: true,
                }
            })
        })


        res.status(201).json({
            message: "Borrow book request accepted successfully. The book has been assigned to the user.",
            status,
        });
    } catch (error) {
        console.log("accept borrow book request controller error:", error);
        res.status(500).json({ message: "Internal Server Error." })
    }
    return;
}