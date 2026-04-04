import { prisma } from '../helpers/prismaDb';
import { redisClient } from '../helpers/redisClient';
import { UserRole } from '@prisma/client';
import { NotificationService } from './notification.service';

export class BorrowService {
  /**
   * Get limits based on user role
   */
  static getBorrowLimits(role: UserRole) {
    switch (role) {
      case 'FACULTY':
        return { maxBooks: 10, durationDays: 30 };
      case 'STAFF':
        return { maxBooks: 5, durationDays: 21 };
      case 'STUDENT':
      default:
        return { maxBooks: 3, durationDays: 14 };
    }
  }

  /**
   * Submit a borrow request for a book
   */
  static async requestBook(userId: string, bookId: string, collegeId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, collegeId: true }
    });

    if (!user || user.collegeId !== collegeId) {
      throw new Error('User not found or access denied');
    }

    const { maxBooks } = this.getBorrowLimits(user.role);

    // Check current active borrows (count from Redis or DB)
    const redisKey = `user:${userId}:borrowedBooks`;
    let activeCountStr = await redisClient.get(redisKey);
    let activeCount: number;

    if (activeCountStr === null) {
      activeCount = await prisma.borrowedBook.count({
        where: { userId, status: 'borrowed' }
      });
      await redisClient.set(redisKey, activeCount, 'EX', 3600);
    } else {
      activeCount = parseInt(activeCountStr);
    }

    if (activeCount >= maxBooks) {
      throw new Error(`You have reached your borrowing limit of ${maxBooks} books.`);
    }

    // Check if user already has a pending request for this book
    const existingRequest = await prisma.borrowedRequests.findFirst({
      where: {
        userId,
        bookId,
        status: 'pending'
      }
    });

    if (existingRequest) {
      throw new Error('You already have a pending request for this book');
    }

    // Check book availability in the specific college
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        collegeId,
        copies: {
          some: { isBorrowed: false }
        }
      }
    });

    if (!book) {
      throw new Error('Book not found or no copies available in your college');
    }

    // Create the request
    return await prisma.borrowedRequests.create({
      data: {
        userId,
        bookId,
        collegeId,
        status: 'pending'
      }
    });
  }

  /**
   * Reject a borrow request
   */
  static async rejectRequest(requestId: string, collegeId: string) {
    const request = await prisma.borrowedRequests.update({
      where: { id: requestId, collegeId },
      data: { status: 'rejected' },
      include: { book: { select: { bookName: true } } }
    });

    await NotificationService.createNotification(
      request.userId,
      'Borrow Request Rejected',
      `Your request for "${request.book.bookName}" has been rejected by the librarian.`
    );

    return request;
  }

  /**
   * Accept a borrow request and create a borrowed book record
   */
  static async acceptRequest(requestId: string, collegeId: string) {
    const borrowRequest = await prisma.borrowedRequests.findUnique({
      where: { id: requestId, collegeId, status: 'pending' },
      include: { user: { select: { id: true, role: true } } }
    });

    if (!borrowRequest) {
      throw new Error('Borrow request not found or already processed');
    }

    const { maxBooks, durationDays } = this.getBorrowLimits(borrowRequest.user.role);

    // Re-check limits before accepting
    const redisKey = `user:${borrowRequest.userId}:borrowedBooks`;
    const activeCount = await prisma.borrowedBook.count({
      where: { userId: borrowRequest.userId, status: 'borrowed' }
    });

    if (activeCount >= maxBooks) {
      throw new Error(`User has reached their borrowing limit of ${maxBooks} books.`);
    }

    // Find an available copy
    const availableBookCopy = await prisma.bookCopy.findFirst({
      where: { isBorrowed: false, bookId: borrowRequest.bookId },
      select: { id: true }
    });

    if (!availableBookCopy) {
      throw new Error('No copies available for this book');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + durationDays);

    return await prisma.$transaction(async (tx) => {
      await tx.borrowedRequests.update({
        where: { id: requestId },
        data: { status: 'accepted' }
      });

      await tx.bookCopy.update({
        where: { id: availableBookCopy.id },
        data: { isBorrowed: true }
      });

      const borrowedBook = await tx.borrowedBook.create({
        data: {
          status: 'borrowed',
          bookCopyId: availableBookCopy.id,
          userId: borrowRequest.userId,
          collegeId,
          dueDate,
        }
      });

      // Update Redis cache
      await redisClient.set(redisKey, activeCount + 1, 'EX', 3600);

      // Create notification
      const book = await tx.book.findUnique({ where: { id: borrowRequest.bookId }, select: { bookName: true } });
      await NotificationService.createNotification(
        borrowRequest.userId,
        'Borrow Request Accepted',
        `Your request for "${book?.bookName}" has been accepted. Please collect it from the library. Due date: ${dueDate.toLocaleDateString()}.`
      );

      return borrowedBook;
    });
  }
}
