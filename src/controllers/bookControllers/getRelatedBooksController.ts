import { Request, Response } from 'express';
import { BookService } from '../../services/book.service';
import { prisma } from '../../helpers/prismaDb';
import logger from '../../helpers/logger';

/**
 * Suggestions shown alongside a book. Public, because browsing does not
 * require an account.
 */
export const getRelatedBooksController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;
        const { collegeCode } = req.query as { collegeCode?: string };

        if (!bookId) {
            res.status(400).json({ message: 'Book ID is required' });
            return;
        }

        const college = collegeCode
            ? await prisma.college.findUnique({ where: { code: collegeCode }, select: { id: true } })
            : null;

        const books = await BookService.getRelatedBooks(bookId, college?.id, 6);

        res.status(200).json({ books });
    } catch (error) {
        logger.error('get related books error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
