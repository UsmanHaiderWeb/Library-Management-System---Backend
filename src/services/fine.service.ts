/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../helpers/prismaDb';

export class FineService {
    private static DAILY_FINE_AMOUNT = 10; // ₹10 per day

    /**
     * Calculate fine for a returned book
     */
    static calculateFine(dueDate: Date | null, returnDate: Date): number {
        if (!dueDate || returnDate <= dueDate) return 0;

        const diffInTime = returnDate.getTime() - dueDate.getTime();
        const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));

        return diffInDays * this.DAILY_FINE_AMOUNT;
    }

    /**
     * Apply fine to a user's account and record the transaction
     */
    static async applyFine(userId: string, amount: number, borrowedBookId: string, daysOverdue: number, tx: any) {
        if (amount <= 0) return;

        await tx.user.update({
            where: { id: userId },
            data: {
                fineBalance: {
                    increment: amount,
                },
            },
        });

        // Record fine transaction
        await tx.fine.create({
            data: {
                userId,
                borrowedBookId,
                amount,
                daysOverdue,
            },
        });
    }

    /**
     * Get fine history for a user (flattened for the Student portal)
     */
    static async getUserFines(userId: string) {
        const fines = await prisma.fine.findMany({
            where: { userId },
            include: {
                borrowedBook: {
                    include: {
                        bookCopy: {
                            include: {
                                book: {
                                    select: { bookName: true, author: true },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return fines.map((fine) => ({
            id: fine.id,
            bookName: fine.borrowedBook.bookCopy.book.bookName,
            author: fine.borrowedBook.bookCopy.book.author,
            amount: fine.amount,
            daysOverdue: fine.daysOverdue,
            status: fine.status,
            paidAt: fine.paidAt,
            createdAt: fine.createdAt,
        }));
    }

    /**
     * Record an offline fine payment (cash at the library desk) or a waiver.
     * Decrements the user's fine balance inside the same transaction.
     */
    static async recordPayment(
        fineId: string,
        collegeId: string,
        adminId: string,
        outcome: 'PAID' | 'WAIVED',
        note?: string,
    ) {
        return prisma.$transaction(async (tx) => {
            const fine = await tx.fine.findUnique({
                where: { id: fineId },
                include: {
                    borrowedBook: {
                        include: {
                            bookCopy: {
                                include: { book: { select: { bookName: true } } },
                            },
                        },
                    },
                    user: { select: { id: true, name: true, fineBalance: true } },
                },
            });

            if (!fine) {
                throw new Error('FINE_NOT_FOUND');
            }
            if (fine.borrowedBook.collegeId !== collegeId) {
                throw new Error('FINE_NOT_FOUND');
            }
            if (fine.status !== 'PENDING') {
                throw new Error('FINE_ALREADY_SETTLED');
            }

            const updated = await tx.fine.update({
                where: { id: fineId },
                data: {
                    status: outcome,
                    paidAt: new Date(),
                    recordedById: adminId,
                    note: note || null,
                },
            });

            // Never let the balance go below zero (legacy fines may predate per-fine tracking)
            const decrement = Math.min(fine.amount, fine.user.fineBalance);
            if (decrement > 0) {
                await tx.user.update({
                    where: { id: fine.userId },
                    data: { fineBalance: { decrement } },
                });
            }

            return {
                fine: updated,
                userId: fine.userId,
                bookName: fine.borrowedBook.bookCopy.book.bookName,
            };
        });
    }

    /**
     * Get all fines for a college (admin view)
     */
    static async getCollegeFines(collegeId: string, pageNumber: number = 0, pageSize: number = 20) {
        const whereClause = {
            borrowedBook: { collegeId },
        };

        const [fines, total] = await Promise.all([
            prisma.fine.findMany({
                where: whereClause,
                include: {
                    user: { select: { id: true, name: true, studentId: true, email: true } },
                    borrowedBook: {
                        include: {
                            bookCopy: {
                                include: {
                                    book: { select: { bookName: true, bookNumber: true } },
                                },
                            },
                        },
                    },
                },
                skip: pageNumber * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            prisma.fine.count({ where: whereClause }),
        ]);

        return {
            fines: fines.map((fine) => ({
                id: fine.id,
                studentName: fine.user.name,
                studentId: fine.user.studentId,
                email: fine.user.email,
                bookName: fine.borrowedBook.bookCopy.book.bookName,
                bookNumber: fine.borrowedBook.bookCopy.book.bookNumber,
                amount: fine.amount,
                daysOverdue: fine.daysOverdue,
                status: fine.status,
                paidAt: fine.paidAt,
                note: fine.note,
                createdAt: fine.createdAt,
            })),
            totalPages: Math.ceil(total / pageSize),
            totalCount: total,
        };
    }
}
