/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { prisma } from '../../helpers/prismaDb';

/**
 * Add or Update Review
 */
export const addReviewController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const { bookId, rating, comment } = req.body;

        if (!user || !user.id || !bookId || !rating) {
            res.status(400).json({ message: 'User ID, Book ID, and Rating are required' });
            return;
        }

        if (!user.isEmailVerified) {
            res.status(403).json({ message: 'Verification required. Please verify your email to post reviews.' });
            return;
        }

        if (rating < 1 || rating > 5) {
            res.status(400).json({ message: 'Rating must be between 1 and 5' });
            return;
        }

        const existingReview = await prisma.review.findFirst({
            where: { userId: user.id, bookId: bookId }
        });

        if (existingReview) {
            const updatedReview = await prisma.review.update({
                where: { id: existingReview.id },
                data: { rating, comment }
            });
            res.status(200).json({ message: 'Review updated successfully', review: updatedReview });
        } else {
            const newReview = await prisma.review.create({
                data: {
                    userId: user.id,
                    bookId: bookId,
                    rating,
                    comment
                }
            });
            res.status(201).json({ message: 'Review added successfully', review: newReview });
        }
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ message: 'Server error while submitting review' });
    }
};

/**
 * Get Reviews by Book ID
 */
export const getBookReviewsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;

        if (!bookId) {
            res.status(400).json({ message: 'Book ID is required' });
            return;
        }

        const reviews = await prisma.review.findMany({
            where: { bookId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate average
        const avgRating = reviews.length > 0
            ? reviews.reduce((sum: number, review: any) => sum + review.rating, 0) / reviews.length
            : 0;

        res.status(200).json({
            reviews,
            totalReviews: reviews.length,
            averageRating: Number(avgRating.toFixed(1))
        });
    } catch (error) {
        console.error('Get book reviews error:', error);
        res.status(500).json({ message: 'Server error while fetching reviews' });
    }
};
