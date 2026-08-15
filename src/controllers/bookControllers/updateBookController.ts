/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';
import logger from '../../helpers/logger';
import { generateUniqueSlug, retireSlug } from '../../helpers/slug';

export const updateBookController = async (req: Request, res: Response): Promise<void> => {
    const admin = (req as RequestWithAdmin).admin;
    const { bookId } = req.params;

    if (!admin) {
        res.status(401).json({ message: 'Unauthorized access' });
        return;
    }

    // Same as create: the validator middleware runs but its results were never
    // inspected, so invalid payloads were persisted silently.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
    }

    const {
        bookNumber,
        isbn,
        bookName,
        summary,
        author,
        genre,
        image,
        bgColor,
        totalBooks,
        isOnline,
        onlineFileUrl,
        almirahNumber,
        shelfNumber
    } = req.body;

    try {
        // Check if book exists
        const existingBook = await prisma.book.findFirst({
            where: {
                id: bookId,
                collegeId: admin.collegeId
            },
            include: {
                _count: {
                    select: { copies: true }
                }
            }
        });

        if (!existingBook) {
            res.status(404).json({ message: 'Book not found' });
            return;
        }

        // Handle totalBooks update logic
        // If new totalBooks > current copies, create more copies.
        // If new totalBooks < current copies, we might need to delete copies? 
        // For simplicity, let's just update the book details and if totalBooks is increased, add copies.
        // If decreased, we should probably check if we can remove unborrowed copies.

        const currentTotal = existingBook._count.copies;
        const newTotal = Number(totalBooks);

        const updateData: any = {
            bookNumber,
            bookName,
            summary,
            author,
            genre,
            image,
            bgColor,
            totalBooks: newTotal,
            almirahNumber: Number(almirahNumber),
            shelfNumber: Number(shelfNumber),
            isOnline,
            onlineFileUrl
        };

        // An omitted ISBN means "leave it as it is", not "clear it" — a caller
        // that never sends the field should not be able to destroy the stored
        // value. Sending it empty is still an explicit clear.
        if (isbn !== undefined) {
            updateData.isbn = isbn || null;
        }

        if (newTotal > currentTotal) {
            const copiesToAdd = newTotal - currentTotal;
            updateData.copies = {
                create: Array.from({ length: copiesToAdd }, () => ({
                    isBorrowed: false
                }))
            };
        } else if (newTotal < currentTotal) {
            const copiesToRemove = currentTotal - newTotal;
            const unborrowedCopies = await prisma.bookCopy.findMany({
                where: {
                    bookId: bookId,
                    isBorrowed: false
                },
                take: copiesToRemove
            });

            if (unborrowedCopies.length < copiesToRemove) {
                const borrowedCount = currentTotal - unborrowedCopies.length;
                const minAllowed = borrowedCount;
                res.status(400).json({
                    message: `Cannot reduce to ${newTotal}. There are ${borrowedCount} borrowed copies. Minimum allowed is ${minAllowed}.`
                });
                return;
            }

            await prisma.bookCopy.deleteMany({
                where: {
                    id: { in: unborrowedCopies.map(c => c.id) }
                }
            });
        }

        // Retitling changes the URL. Keep the old slug on record so links
        // already shared or bookmarked still resolve to this book.
        const titleChanged = bookName && bookName !== existingBook.bookName;
        if (titleChanged || !existingBook.slug) {
            const nextSlug = await generateUniqueSlug(bookName, admin.collegeId, bookId);
            if (nextSlug !== existingBook.slug) {
                if (existingBook.slug) {
                    await retireSlug(existingBook.slug, bookId, admin.collegeId);
                }
                updateData.slug = nextSlug;
            }
        }

        const updatedBook = await prisma.book.update({
            where: { id: bookId },
            data: updateData
        });

        res.status(200).json({ message: 'Book updated successfully', book: updatedBook });

    } catch (error: any) {
        logger.error('Update book error:', error?.message || error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
