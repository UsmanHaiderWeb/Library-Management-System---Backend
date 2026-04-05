import { Request, Response } from 'express';
import { OverdueService } from '../../services/overdue.service';

/**
 * Get overdue books summary (Admin only)
 */
export const getOverdueSummaryController = async (_req: Request, res: Response) => {
  try {
    const overdueBooks = await OverdueService.getOverdueBooks();
    const dueSoonBooks = await OverdueService.getBooksDueSoon(2);

    res.json({
      success: true,
      data: {
        overdueCount: overdueBooks.length,
        dueSoonCount: dueSoonBooks.length,
        overdueBooks: overdueBooks.map((b) => ({
          id: b.id,
          userName: b.user.name,
          userEmail: b.user.email,
          bookName: b.bookCopy.book.bookName,
          dueDate: b.dueDate,
          daysOverdue: b.dueDate
            ? Math.floor(
                (new Date().getTime() - b.dueDate.getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            : 0,
        })),
        dueSoonBooks: dueSoonBooks.map((b) => ({
          id: b.id,
          userName: b.user.name,
          userEmail: b.user.email,
          bookName: b.bookCopy.book.bookName,
          dueDate: b.dueDate,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching overdue summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overdue summary' });
  }
};

/**
 * Manually trigger overdue reminders (Admin only)
 */
export const triggerOverdueRemindersController = async (_req: Request, res: Response) => {
  try {
    const result = await OverdueService.runAllReminders();

    res.json({
      success: true,
      message: 'Overdue reminders sent successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error triggering reminders:', error);
    res.status(500).json({ success: false, message: 'Failed to send reminders' });
  }
};
