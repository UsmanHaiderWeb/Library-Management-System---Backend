/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../helpers/prismaDb';
import { NotificationService } from './notification.service';
import { BorrowService } from './borrow.service';

export class RenewalService {
    /**
     * Request a renewal for a borrowed book
     */
    static async requestRenewal(userId: string, borrowedBookId: string) {
        const borrowedBook = await prisma.borrowedBook.findUnique({
            where: { id: borrowedBookId, userId, status: 'borrowed' },
            include: { bookCopy: { include: { book: true } } },
        });

        if (!borrowedBook) {
            throw new Error('Borrowed book not found or already returned');
        }

        if (!borrowedBook.dueDate) {
            throw new Error('No due date set for this book');
        }

        // Check for existing pending renewal
        const existingRequest = await prisma.renewalRequest.findFirst({
            where: { borrowedBookId, userId, status: 'PENDING' },
        });

        if (existingRequest) {
            throw new Error('A renewal request is already pending for this book');
        }

        // Get role-based borrow limits to determine extension period
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const limits = BorrowService.getBorrowLimits(user.role);
        const extensionDays = Math.floor(limits.durationDays / 2); // Half the original borrow period

        const newDueDate = new Date(borrowedBook.dueDate);
        newDueDate.setDate(newDueDate.getDate() + extensionDays);

        const request = await prisma.renewalRequest.create({
            data: {
                borrowedBookId,
                userId,
                newDueDate,
            },
        });

        return { request, extensionDays, newDueDate };
    }

    /**
     * Approve a renewal request (admin)
     */
    static async approveRenewal(requestId: string, collegeId: string) {
        const request = await prisma.renewalRequest.findUnique({
            where: { id: requestId, status: 'PENDING' },
            include: {
                borrowedBook: {
                    include: { bookCopy: { include: { book: true } } },
                },
            },
        });

        if (!request) throw new Error('Renewal request not found or already processed');
        if (request.borrowedBook.collegeId !== collegeId) throw new Error('Access denied');

        await prisma.$transaction([
            prisma.renewalRequest.update({
                where: { id: requestId },
                data: { status: 'APPROVED' },
            }),
            prisma.borrowedBook.update({
                where: { id: request.borrowedBookId },
                data: { dueDate: request.newDueDate },
            }),
        ]);

        await NotificationService.createNotification(
            request.userId,
            'Renewal Approved',
            `Your renewal request for "${request.borrowedBook.bookCopy.book.bookName}" has been approved. New due date: ${request.newDueDate.toLocaleDateString()}.`
        );

        return request;
    }

    /**
     * Reject a renewal request (admin)
     */
    static async rejectRenewal(requestId: string, collegeId: string) {
        const request = await prisma.renewalRequest.findUnique({
            where: { id: requestId, status: 'PENDING' },
            include: {
                borrowedBook: {
                    include: { bookCopy: { include: { book: true } } },
                },
            },
        });

        if (!request) throw new Error('Renewal request not found or already processed');
        if (request.borrowedBook.collegeId !== collegeId) throw new Error('Access denied');

        await prisma.renewalRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' },
        });

        await NotificationService.createNotification(
            request.userId,
            'Renewal Rejected',
            `Your renewal request for "${request.borrowedBook.bookCopy.book.bookName}" has been rejected. Please return the book by the original due date.`
        );

        return request;
    }

    /**
     * Get all renewal requests for a college (admin)
     */
    static async getCollegeRenewalRequests(collegeId: string, status?: string) {
        const whereClause: any = {
            borrowedBook: { collegeId },
        };
        if (status) whereClause.status = status;

        return prisma.renewalRequest.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, studentId: true } },
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
            orderBy: { requestedOn: 'desc' },
        });
    }

    /**
     * Get user's renewal requests
     */
    static async getUserRenewalRequests(userId: string) {
        return prisma.renewalRequest.findMany({
            where: { userId },
            include: {
                borrowedBook: {
                    include: {
                        bookCopy: {
                            include: {
                                book: { select: { bookName: true, author: true } },
                            },
                        },
                    },
                },
            },
            orderBy: { requestedOn: 'desc' },
        });
    }
}
