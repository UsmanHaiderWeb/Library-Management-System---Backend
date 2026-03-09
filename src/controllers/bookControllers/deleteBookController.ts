/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { prisma } from '../../helpers/prismaDb';
import { RequestWithAdmin } from '../../helpers/interfaces';

export const deleteBookController = async (req: Request, res: Response): Promise<void> => {
    const admin = (req as RequestWithAdmin).admin;
    const { bookId } = req.params;

    if (!admin) {
        res.status(401).json({ message: 'Unauthorized access' });
        return;
    }

    try {
        // Check if book exists and belongs to the admin's college
        const book = await prisma.book.findFirst({
            where: {
                id: bookId,
                collegeId: admin.collegeId
            }
        });

        if (!book) {
            res.status(404).json({ message: 'Book not found' });
            return;
        }

        // Delete the book (Cascade will handle copies and requests if configured in schema, 
        // but based on schema review:
        // BookCopy has onDelete: Cascade.
        // BorrowedRequests has onDelete: Cascade.
        // BorrowedBook does NOT have onDelete: Cascade on bookCopyId relation directly in a way that deletes BorrowedBook when Book is deleted? 
        // Wait, BorrowedBook relates to BookCopy. If BookCopy is deleted (cascade from Book), does BorrowedBook get deleted?
        // Schema: 
        // model BorrowedBook { ... bookCopy BookCopy @relation(..., onDelete: Cascade) ... }
        // Yes, it seems BorrowedBook also cascades on BookCopy delete.
        
        await prisma.book.delete({
            where: {
                id: bookId
            }
        });

        res.status(200).json({ message: 'Book deleted successfully' });

    } catch (error: any) {
        console.error('Delete book error:', error?.message || error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
