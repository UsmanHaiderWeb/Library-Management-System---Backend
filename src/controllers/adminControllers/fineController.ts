import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { FineService } from '../../services/fine.service';
import { NotificationService } from '../../services/notification.service';
import logger from '../../helpers/logger';

// Admin: record an offline fine payment (cash at desk) or waive a fine
export const recordFinePaymentController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { fineId } = req.params;
        const outcome = req.path.includes('/waive') ? 'WAIVED' : 'PAID';
        // Express 5 leaves req.body undefined when no JSON body was sent
        const { note } = (req.body || {}) as { note?: string };

        if (!fineId) {
            res.status(400).json({ message: 'Fine ID is required' });
            return;
        }
        if (note && note.length > 255) {
            res.status(400).json({ message: 'Note must be 255 characters or fewer' });
            return;
        }

        const result = await FineService.recordPayment(fineId, admin.collegeId, admin.id, outcome, note);

        await NotificationService.createNotification(
            result.userId,
            outcome === 'PAID' ? 'Fine Payment Recorded' : 'Fine Waived',
            outcome === 'PAID'
                ? `Your payment of ₹${result.fine.amount} for "${result.bookName}" has been recorded. Thank you.`
                : `Your fine of ₹${result.fine.amount} for "${result.bookName}" has been waived.`,
        );

        res.status(200).json({
            message: outcome === 'PAID' ? 'Payment recorded successfully' : 'Fine waived successfully',
            fine: result.fine,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : '';
        if (message === 'FINE_NOT_FOUND') {
            res.status(404).json({ message: 'Fine not found' });
            return;
        }
        if (message === 'FINE_ALREADY_SETTLED') {
            res.status(409).json({ message: 'This fine has already been paid or waived' });
            return;
        }
        logger.error('record fine payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
