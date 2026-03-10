import { Request, Response } from 'express';
import { RequestWithUser } from '../../helpers/interfaces';
import { DigitalLibraryService } from '../../services/digital.service';

/**
 * Access a digital book file (Securely)
 */
export const getDigitalFileController = async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user;
        const { bookId } = req.params;

        if (!bookId) {
            return res.status(400).json({ message: 'Book ID is required' });
        }

        const fileUrl = await DigitalLibraryService.canAccess(user.id, bookId, user.collegeId as string);

        res.json({
            message: 'Access granted',
            fileUrl
        });
    } catch (error: any) {
        console.error('digital access error:', error);
        res.status(error.message.includes('verified') ? 403 : 
                   error.message.includes('not available') ? 404 : 400)
           .json({ message: error.message || 'Server error' });
    }
};
