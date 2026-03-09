import { Request, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { prisma } from "../../helpers/prismaDb";
import { redisClient } from "../../helpers/redisClient";
import { FineService } from "../../services/fine.service";

export const changeReturnStatusForBorrowedBookController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        const { borrowedBookId } = req.params;
        const { status } = req.body;

        if (!borrowedBookId || status !== 'returned') {
            res.status(400).json({ message: "Invalid request. Provide valid book ID and 'returned' status." });
            return;
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
                dueDate: true,
            }
        });

        if (!borrowedBook) {
            res.status(400).json({ message: "Borrowed Book not found or already returned." });
            return;
        }

        const returnedOn = new Date();
        const fineAmount = FineService.calculateFine(borrowedBook.dueDate, returnedOn);

        await prisma.$transaction(async (tx) => {
            await tx.borrowedBook.update({
                where: { id: borrowedBook.id },
                data: {
                    status: "returned",
                    returnedOn,
                }
            });

            await tx.bookCopy.update({
                where: { id: borrowedBook.bookCopyId },
                data: { isBorrowed: false }
            });

            if (fineAmount > 0) {
                await FineService.applyFine(borrowedBook.userId, fineAmount, tx);
            }

            const redisKey = `user:${borrowedBook.userId}:borrowedBooks`;
            await redisClient.del(redisKey);
        });

        res.status(200).json({
            message: "Borrowed book has been returned.",
            fineApplied: fineAmount,
            returnedOn,
        });

    } catch (error) {
        console.error("return borrowed book controller error:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
};
