import { Request, Response } from 'express';
import { RequestWithUser } from '../../helpers/interfaces';
import { BorrowService } from '../../services/borrow.service';

export const borrowBookController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const { bookId } = req.params;

        if (!bookId) {
            res.status(400).json({ message: 'Book ID is required' });
            return;
        }

        const borrowRequest = await BorrowService.requestBook(user.id, bookId, user.collegeId as string);

        res.json({ 
            message: 'Borrow request submitted successfully. Waiting for admin approval.',
            borrowRequest
        });
    } catch (error: any) {
        console.error('borrow book error:', error);
        res.status(error.message.includes('limit') || error.message.includes('already') ? 400 : 500)
           .json({ message: error.message || 'Server error' });
    }
};