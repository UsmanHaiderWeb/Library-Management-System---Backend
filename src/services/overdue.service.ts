import { prisma } from '../helpers/prismaDb';
import { NotificationService } from './notification.service';
import { EmailService } from './email.service';
import logger from '../helpers/logger';

export class OverdueService {
  /**
   * Find all currently borrowed books that are overdue
   */
  static async getOverdueBooks() {
    return await prisma.borrowedBook.findMany({
      where: {
        status: 'borrowed',
        dueDate: {
          lt: new Date(),
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        bookCopy: {
          include: {
            book: { select: { bookName: true, author: true } },
          },
        },
      },
    });
  }

  /**
   * Find all borrowed books due within the next N days (approaching due date)
   */
  static async getBooksDueSoon(daysAhead: number = 2) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await prisma.borrowedBook.findMany({
      where: {
        status: 'borrowed',
        dueDate: {
          gte: now,
          lte: futureDate,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        bookCopy: {
          include: {
            book: { select: { bookName: true, author: true } },
          },
        },
      },
    });
  }

  /**
   * Send reminders for books due soon (approaching due date)
   */
  static async sendDueSoonReminders() {
    const dueSoonBooks = await this.getBooksDueSoon(2);
    let sent = 0;

    for (const borrowedBook of dueSoonBooks) {
      const bookName = borrowedBook.bookCopy.book.bookName;
      const dueDate = borrowedBook.dueDate
        ? borrowedBook.dueDate.toLocaleDateString()
        : 'Unknown';
      const userName = borrowedBook.user.name;
      const userEmail = borrowedBook.user.email;

      // Send in-app notification
      await NotificationService.createNotification(
        borrowedBook.userId,
        'Book Due Soon',
        `"${bookName}" is due on ${dueDate}. Please return it on time to avoid fines.`
      );

      // Send email reminder
      await EmailService.sendEmail(
        userEmail,
        'LMS - Book Due Soon',
        `
        <h2>Due Date Reminder</h2>
        <p>Hi ${userName},</p>
        <p>This is a friendly reminder that <strong>"${bookName}"</strong> is due on <strong>${dueDate}</strong>.</p>
        <p>Please return it on time to avoid late fees (₹10/day).</p>
        <p>Thank you,<br/>Library Management System</p>
        `
      );

      sent++;
    }

    return { type: 'due_soon', count: sent };
  }

  /**
   * Send reminders for overdue books
   */
  static async sendOverdueReminders() {
    const overdueBooks = await this.getOverdueBooks();
    let sent = 0;

    for (const borrowedBook of overdueBooks) {
      const bookName = borrowedBook.bookCopy.book.bookName;
      const dueDate = borrowedBook.dueDate
        ? borrowedBook.dueDate.toLocaleDateString()
        : 'Unknown';
      const userName = borrowedBook.user.name;
      const userEmail = borrowedBook.user.email;

      const now = new Date();
      const daysOverdue = borrowedBook.dueDate
        ? Math.floor(
            (now.getTime() - borrowedBook.dueDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        : 0;
      const estimatedFine = daysOverdue * 10;

      // Send in-app notification
      await NotificationService.createNotification(
        borrowedBook.userId,
        'Overdue Book',
        `"${bookName}" was due on ${dueDate} and is ${daysOverdue} day(s) overdue. Current estimated fine: ₹${estimatedFine}. Please return it immediately.`
      );

      // Send email reminder
      await EmailService.sendEmail(
        userEmail,
        'LMS - Overdue Book Notice',
        `
        <h2>Overdue Book Notice</h2>
        <p>Hi ${userName},</p>
        <p><strong>"${bookName}"</strong> was due on <strong>${dueDate}</strong> and is now <strong>${daysOverdue} day(s) overdue</strong>.</p>
        <p>Your current estimated fine is <strong>₹${estimatedFine}</strong> (₹10/day).</p>
        <p>Please return the book as soon as possible to avoid additional fines.</p>
        <p>Thank you,<br/>Library Management System</p>
        `
      );

      sent++;
    }

    return { type: 'overdue', count: sent };
  }

  /**
   * Run all reminder checks — called by the cron job
   */
  static async runAllReminders() {
    logger.info(`[${new Date().toISOString()}] Running overdue reminder checks...`);

    try {
      const dueSoonResult = await this.sendDueSoonReminders();
      const overdueResult = await this.sendOverdueReminders();

      logger.info(
        `[${new Date().toISOString()}] Reminders sent — Due soon: ${dueSoonResult.count}, Overdue: ${overdueResult.count}`
      );

      return { dueSoon: dueSoonResult, overdue: overdueResult };
    } catch (error) {
      logger.error('Error running overdue reminders:', error);
      throw error;
    }
  }
}
