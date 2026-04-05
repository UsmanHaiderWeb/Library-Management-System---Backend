import { Request, Response } from 'express';
import { BookService } from '../../services/book.service';
import { prisma } from '../../helpers/prismaDb';
import logger from '../../helpers/logger';

export const getPublicBooksController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { pageNumber, searchQuery, genre, isOnline, availableOnly, collegeCode } = req.query as any;

        let collegeId: string | undefined = undefined;

        if (collegeCode) {
            const college = await prisma.college.findUnique({
                where: { code: collegeCode }
            });
            if (college) {
                collegeId = college.id;
            }
        }

        const result = await BookService.getAllBooks({
            collegeId,
            pageNumber: parseInt(pageNumber) || 0,
            searchQuery: searchQuery || '',
            genre: genre || undefined,
            isOnline: isOnline === 'true' ? true : isOnline === 'false' ? false : undefined,
            availableOnly: availableOnly === 'true',
            pageSize: 15
        });

        res.status(200).json(result);
    } catch (error) {
        logger.error('get public books error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
