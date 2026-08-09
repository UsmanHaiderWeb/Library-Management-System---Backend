import { Request, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { prisma } from "../../helpers/prismaDb";
import { redisClient } from "../../helpers/redisClient";
import { FineService } from "../../services/fine.service";
import logger from '../../helpers/logger';
import { NotificationService } from "../../services/notification.service";
import { ReservationService } from "../../services/reservation.service";

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

        // Only the atomic state changes belong in here. Cache invalidation and
        // notifications used to run inside this transaction, and the
        // notification service issues queries on its own Prisma client — so it
        // competed for a connection while this transaction held one and pushed
        // the whole thing past Prisma's 5s interactive-transaction limit,
        // failing the return with a 500 and rolling back the fine.
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
                const daysOverdue = Math.ceil((returnedOn.getTime() - borrowedBook.dueDate!.getTime()) / (1000 * 3600 * 24));
                await FineService.applyFine(borrowedBook.userId, fineAmount, borrowedBook.id, daysOverdue, tx);
            }
        });

        // --- post-commit side effects: none of these may fail the return ---
        const bookCopy = await prisma.bookCopy.findUnique({
            where: { id: borrowedBook.bookCopyId },
            include: { book: { select: { id: true, bookName: true } } },
        });

        try {
            await redisClient.del(`user:${borrowedBook.userId}:borrowedBooks`);
        } catch (cacheError) {
            logger.error("Failed to invalidate borrowed books cache:", cacheError);
        }

        await NotificationService.createNotification(
            borrowedBook.userId,
            'Book Return Successful',
            `You have successfully returned "${bookCopy?.book.bookName}".${fineAmount > 0 ? ` A fine of ₹${fineAmount} has been applied for late return.` : ''}`,
            'BorrowStatus'
        );

        // Notify next person in the reservation queue for this book
        if (bookCopy) {
            await ReservationService.notifyNextInQueue(bookCopy.book.id);
        }

        res.status(200).json({
            message: "Borrowed book has been returned.",
            fineApplied: fineAmount,
            returnedOn,
        });

    } catch (error) {
        logger.error("return borrowed book controller error:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
};
