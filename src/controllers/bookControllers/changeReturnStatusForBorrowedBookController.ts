/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { prisma } from "../../helpers/prismaDb";
import { redisClient } from "../../helpers/redisClient";

export const changeReturnStatusForBorrowedBookController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        const { borrowedBookId } = (req as any).params;
        if (!borrowedBookId) {
            res.status(400).json({ message: "Please provide select a valid book." })
        }

        const { status } = (req as any).body;
        if (!status || status != 'returned') {
            res.status(400).json({ message: "Please provide status." })
        }

        const borrowedBook = await prisma.borrowedBook.findUnique({
            where: {
                id: borrowedBookId,
                collegeId: admin.collegeId,
                status: 'borrowed',
            },
            select: {
                id: true,
                userId: true,
                bookCopyId: true,
            }
        })
        if (!borrowedBook) {
            res.status(400).json({ message: "Borrowed Book not found or already returned." })
            return;
        }

        const returnedOn = new Date();

        await prisma.$transaction(async (tx) => {
            await tx.borrowedBook.update({
                where: {
                    id: borrowedBook.id,
                    userId: borrowedBook.userId,
                    collegeId: admin.collegeId,
                    bookCopyId: borrowedBook?.bookCopyId
                },
                data: {
                    status: "returned",
                    returnedOn,
                }
            })


            await tx.bookCopy.update({
                where: {
                    id: borrowedBook?.bookCopyId,
                    isBorrowed: true,
                },
                data: {
                    isBorrowed: false
                }
            })

            // delete the user's borrowed books count from Redis first
            const redisKey = `user:${borrowedBook.userId}:borrowedBooks`;
            await redisClient.del(redisKey);

        })


        res.status(201).json({
            message: "Borrowed book has been returned.",
            status,
            returnedOn,
        });
    } catch (error) {
        console.log("return borrowed book controller error:", error);
        res.status(500).json({ message: "Internal Server Error." })
    }
    return;
}