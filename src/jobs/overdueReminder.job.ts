import cron from 'node-cron';
import { OverdueService } from '../services/overdue.service';
import logger from '../helpers/logger';

/**
 * Schedule overdue reminder jobs
 *
 * Runs daily at 8:00 AM to:
 * 1. Notify users whose books are due within 2 days
 * 2. Notify users whose books are already overdue
 */
export function scheduleOverdueReminders() {
  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      await OverdueService.runAllReminders();
    } catch (error) {
      logger.error('Overdue reminder cron job failed:', error);
    }
  });

  logger.info('Overdue reminder cron job scheduled (daily at 8:00 AM)');
}
