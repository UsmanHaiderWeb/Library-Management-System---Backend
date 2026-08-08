import { Request, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { prisma } from "../../helpers/prismaDb";
import logger from '../../helpers/logger';

export const getAnalyticsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        if (!admin || !admin.collegeId) {
            res.status(401).json({ message: "Unauthorized access" });
            return;
        }

        const collegeId = admin.collegeId;
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const [
            books,
            topBorrowedRaw,
            borrowingByMonthRaw,
            userRoleRaw,
            requestStatsRaw,
            purchaseRequestStatsRaw,
            topActiveUsersRaw,
            overdueBooksCount,
            returnedBooks,
            fineAggregation,
            usersWithFines,
        ] = await Promise.all([
            // 1. All books for genre distribution
            prisma.book.findMany({
                where: { collegeId },
                select: { genre: true },
            }),

            // 2. Top 10 most borrowed books
            prisma.borrowedBook.groupBy({
                by: ["bookCopyId"],
                where: { collegeId },
                _count: { id: true },
                orderBy: { _count: { id: "desc" } },
                take: 50, // fetch extra since we need to group by book, not bookCopy
            }),

            // 3. Borrowing by month (last 12 months)
            prisma.borrowedBook.findMany({
                where: {
                    collegeId,
                    borrowedOn: { gte: twelveMonthsAgo },
                },
                select: { borrowedOn: true },
            }),

            // 4. User role distribution
            prisma.user.groupBy({
                by: ["role"],
                where: { collegeId },
                _count: { id: true },
            }),

            // 5. Borrow request stats
            prisma.borrowedRequests.groupBy({
                by: ["status"],
                where: { collegeId },
                _count: { id: true },
            }),

            // 6. Purchase request stats
            prisma.purchaseRequest.groupBy({
                by: ["status"],
                where: { collegeId },
                _count: { id: true },
            }),

            // 7. Top 10 active users (most active borrows)
            prisma.borrowedBook.groupBy({
                by: ["userId"],
                where: { collegeId, status: "borrowed" },
                _count: { id: true },
                orderBy: { _count: { id: "desc" } },
                take: 10,
            }),

            // 8. Overdue books count
            prisma.borrowedBook.count({
                where: {
                    collegeId,
                    status: "borrowed",
                    dueDate: { lt: now },
                },
            }),

            // 9. Returned books for average borrow duration
            prisma.borrowedBook.findMany({
                where: {
                    collegeId,
                    status: "returned",
                    returnedOn: { not: null },
                },
                select: { borrowedOn: true, returnedOn: true },
            }),

            // 10a. Total fines (sum of fineBalance)
            prisma.user.aggregate({
                where: { collegeId },
                _sum: { fineBalance: true },
            }),

            // 10b. Users with fines > 0
            prisma.user.count({
                where: { collegeId, fineBalance: { gt: 0 } },
            }),
        ]);

        // 1. Genre distribution - parse comma-separated genres
        const genreMap: Record<string, number> = {};
        for (const book of books) {
            const genres = book.genre.split(",").map((g) => g.trim()).filter(Boolean);
            for (const genre of genres) {
                genreMap[genre] = (genreMap[genre] || 0) + 1;
            }
        }
        const genreDistribution = Object.entries(genreMap)
            .map(([genre, count]) => ({ genre, count }))
            .sort((a, b) => b.count - a.count);

        // 2. Top borrowed books - resolve bookCopy -> book and aggregate
        const bookCopyIds = topBorrowedRaw.map((r) => r.bookCopyId);
        const bookCopies = await prisma.bookCopy.findMany({
            where: { id: { in: bookCopyIds } },
            select: { id: true, bookId: true, book: { select: { bookName: true, author: true } } },
        });
        const copyToBook = new Map(bookCopies.map((c) => [c.id, c]));

        const bookBorrowCounts: Record<string, { bookId: string; bookName: string; author: string; count: number }> = {};
        for (const row of topBorrowedRaw) {
            const copy = copyToBook.get(row.bookCopyId);
            if (!copy) continue;
            const existing = bookBorrowCounts[copy.bookId];
            if (existing) {
                existing.count += row._count.id;
            } else {
                bookBorrowCounts[copy.bookId] = {
                    bookId: copy.bookId,
                    bookName: copy.book.bookName,
                    author: copy.book.author,
                    count: row._count.id,
                };
            }
        }
        const topBorrowedBooks = Object.values(bookBorrowCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
            .map(({ bookId, bookName, author, count }) => ({ bookId, bookName, author, borrowCount: count }));

        // 3. Borrowing by month
        const monthMap: Record<string, number> = {};
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            monthMap[key] = 0;
        }
        for (const record of borrowingByMonthRaw) {
            const d = record.borrowedOn;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            if (key in monthMap) {
                monthMap[key]++;
            }
        }
        const borrowingByMonth = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

        // 4. User role distribution
        const userRoleDistribution = {
            STUDENT: 0,
            FACULTY: 0,
            STAFF: 0,
        };
        for (const row of userRoleRaw) {
            userRoleDistribution[row.role] = row._count.id;
        }

        // 5. Request stats
        const requestStats = { pending: 0, accepted: 0, rejected: 0 };
        for (const row of requestStatsRaw) {
            requestStats[row.status] = row._count.id;
        }

        // 6. Purchase request stats
        const purchaseRequestStats = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
        for (const row of purchaseRequestStatsRaw) {
            purchaseRequestStats[row.status] = row._count.id;
        }

        // 7. Top active users - resolve user names
        const activeUserIds = topActiveUsersRaw.map((r) => r.userId);
        const activeUsers = await prisma.user.findMany({
            where: { id: { in: activeUserIds } },
            select: { id: true, name: true, email: true, studentId: true },
        });
        const userMap = new Map(activeUsers.map((u) => [u.id, u]));
        const topActiveUsers = topActiveUsersRaw.map((row) => {
            const user = userMap.get(row.userId);
            return {
                userId: row.userId,
                name: user?.name ?? "Unknown",
                email: user?.email ?? "Unknown",
                studentId: user?.studentId ?? "",
                borrowCount: row._count.id,
            };
        });

        // 9. Average borrow duration
        let averageBorrowDuration = 0;
        if (returnedBooks.length > 0) {
            const totalDays = returnedBooks.reduce((sum, record) => {
                const borrowedOn = new Date(record.borrowedOn).getTime();
                const returnedOn = new Date(record.returnedOn!).getTime();
                const diffDays = (returnedOn - borrowedOn) / (1000 * 60 * 60 * 24);
                return sum + diffDays;
            }, 0);
            averageBorrowDuration = Math.round((totalDays / returnedBooks.length) * 100) / 100;
        }

        // 10. Fine stats
        const fineStats = {
            totalFines: fineAggregation._sum.fineBalance ?? 0,
            usersWithFines,
        };

        res.status(200).json({
            analytics: {
                genreDistribution,
                topBorrowedBooks,
                borrowingByMonth,
                userRoleDistribution,
                requestStats,
                purchaseRequestStats,
                topActiveUsers,
                overdueBooksCount,
                averageBorrowDuration,
                fineStats,
            },
        });
    } catch (error) {
        logger.error("get analytics error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
