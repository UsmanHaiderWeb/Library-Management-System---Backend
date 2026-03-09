import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { BookService } from '../../services/book.service';

export const getAllBooksController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { pageNumber, searchQuery, genre, isOnline, availableOnly } = req.query as any;

        const result = await BookService.getAllBooks({
            collegeId: admin.collegeId,
            pageNumber: parseInt(pageNumber) || 0,
            searchQuery: searchQuery || '',
            genre: genre || undefined,
            isOnline: isOnline === 'true' ? true : isOnline === 'false' ? false : undefined,
            availableOnly: availableOnly === 'true'
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('get all books error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
