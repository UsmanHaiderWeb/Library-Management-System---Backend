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
     * Get fine history for a user
     */
    static async getUserFines(userId: string) {
        return prisma.fine.findMany({
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
            fines,
            totalPages: Math.ceil(total / pageSize),
            totalCount: total,
        };
    }
}
