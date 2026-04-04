/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { prisma } from '../../helpers/prismaDb';

/**
 * Toggle Save Book (Add to or Remove from Wishlist)
 */
export const toggleSavedBookController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { bookId } = req.body;

        if (!user || !user.id || !bookId) {
            res.status(400).json({ message: 'User ID and Book ID are required' });
            return;
        }

        if (!user.isEmailVerified) {
            res.status(403).json({ message: 'Verification required. Please verify your email to manage wishlist.' });
            return;
        }

        const existingSave = await prisma.savedBook.findUnique({
            where: {
                userId_bookId: {
                    userId: user.id,
                    bookId: bookId,
                }
            }
        });

        if (existingSave) {
            await prisma.savedBook.delete({
                where: { id: existingSave.id },
            });
            res.status(200).json({ message: 'Book removed from wishlist', isSaved: false });
        } else {
            await prisma.savedBook.create({
                data: {
                    userId: user.id,
                    bookId: bookId,
                }
            });
            res.status(201).json({ message: 'Book added to wishlist', isSaved: true });
        }
    } catch (error) {
        console.error('Toggle saved book error:', error);
        res.status(500).json({ message: 'Server error while toggling wishlist' });
    }
};

/**
 * Get User's Wishlist
 */
export const getWishlistController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        if (!user || !user.id) {
            res.status(400).json({ message: 'User not found in request' });
            return;
        }

        const savedBooks = await prisma.savedBook.findMany({
            where: { userId: user.id },
            include: {
                book: {
                    select: {
                        id: true,
                        bookName: true,
                        author: true,
                        image: true,
                        bgColor: true,
                        genre: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json({ savedBooks });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ message: 'Server error while fetching wishlist' });
    }
};
