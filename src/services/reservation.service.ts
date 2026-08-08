import { prisma } from '../helpers/prismaDb';
import { NotificationService } from './notification.service';

export class ReservationService {
    /**
     * Join the waitlist for a book
     */
    static async joinWaitlist(userId: string, bookId: string) {
        // Check if already on waitlist
        const existing = await prisma.reservation.findUnique({
            where: { bookId_userId: { bookId, userId } },
        });

        if (existing && existing.status === 'WAITING') {
            throw new Error('You are already on the waitlist for this book');
        }

        if (existing && existing.status === 'NOTIFIED') {
            throw new Error('You have been notified about this book. Please borrow it.');
        }

        // Get next position
        const lastReservation = await prisma.reservation.findFirst({
            where: { bookId, status: 'WAITING' },
            orderBy: { position: 'desc' },
        });

        const position = (lastReservation?.position || 0) + 1;

        if (existing) {
            // Re-join (was cancelled or fulfilled before)
            return prisma.reservation.update({
                where: { id: existing.id },
                data: { status: 'WAITING', position },
            });
        }

        return prisma.reservation.create({
            data: { bookId, userId, position },
        });
    }

    /**
     * Cancel a reservation
     */
    static async cancelReservation(userId: string, bookId: string) {
        const reservation = await prisma.reservation.findUnique({
            where: { bookId_userId: { bookId, userId } },
        });

        if (!reservation || reservation.status !== 'WAITING') {
            throw new Error('No active reservation found');
        }

        await prisma.reservation.update({
            where: { id: reservation.id },
            data: { status: 'CANCELLED' },
        });
    }

    /**
     * Get waitlist for a book (public)
     */
    static async getWaitlistPosition(userId: string, bookId: string) {
        const reservation = await prisma.reservation.findUnique({
            where: { bookId_userId: { bookId, userId } },
        });

        if (!reservation || reservation.status !== 'WAITING') {
            return null;
        }

        const ahead = await prisma.reservation.count({
            where: { bookId, status: 'WAITING', position: { lt: reservation.position } },
        });

        return { position: ahead + 1, totalWaiting: ahead + 1 };
    }

    /**
     * Notify next person in queue when a book is returned
     * Called from the return controller
     */
    static async notifyNextInQueue(bookId: string) {
        const book = await prisma.book.findUnique({
            where: { id: bookId },
            select: { bookName: true },
        });

        if (!book) return;

        const nextReservation = await prisma.reservation.findFirst({
            where: { bookId, status: 'WAITING' },
            orderBy: { position: 'asc' },
        });

        if (!nextReservation) return;

        await prisma.reservation.update({
            where: { id: nextReservation.id },
            data: { status: 'NOTIFIED' },
        });

        await NotificationService.createNotification(
            nextReservation.userId,
            'Book Available!',
            `"${book.bookName}" is now available. You were next on the waitlist! Please borrow it before someone else does.`,
            'Reservation'
        );
    }

    /**
     * Get user's reservations
     */
    static async getUserReservations(userId: string) {
        return prisma.reservation.findMany({
            where: { userId, status: { in: ['WAITING', 'NOTIFIED'] } },
            include: {
                book: { select: { id: true, bookName: true, author: true, image: true, bgColor: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
