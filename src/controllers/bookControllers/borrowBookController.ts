/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithUser } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';
import { redisClient } from '../../helpers/redisClient';

export const borrowBookController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const { bookId } = req.params;

        if (!bookId) {
            res.status(400).json({ message: 'Book ID is required' });
            return;
        }

        // Try to get borrowed books count from Redis first
        const redisKey = `user:${user.id}:borrowedBooks`;
        let currentBorrowedBooks: any = await redisClient.get(redisKey);
        
        // If not in Redis, get from database and cache it
        if (!currentBorrowedBooks || currentBorrowedBooks == 0) {
            currentBorrowedBooks = await prisma.borrowedBook.count({
                where: {
                    userId: user.id,
                    status: 'borrowed'
                }
            });
            
            // Cache for 1 hour
            await redisClient.set(redisKey, currentBorrowedBooks, 'EX', 3600);
        } else {
            currentBorrowedBooks = parseInt(currentBorrowedBooks);
        }

        
        if (currentBorrowedBooks >= 2) {
            res.status(400).json({ 
                message: 'You have already borrowed the maximum number of books (2). Please return a book before borrowing another one.' 
            });
            return;
        }

        // Check if the book exists and has available copies
        const book = await prisma.book.findFirst({
            where: {
                id: bookId,
                collegeId: user?.collegeId,
                copies: {
                    some: {
                        isBorrowed: false
                    }
                }
            }
        });

        if (!book) {
            res.status(404).json({ message: 'Book not found or no copies available' });
            return;
        }

        // Check if user already has a pending request for this book
        const existingRequest = await prisma.borrowedRequests.findFirst({
            where: {
                userId: user.id,
                bookId: bookId,
                collegeId: user.collegeId,
                status: 'pending'
            }
        });

        if (existingRequest) {
            res.status(400).json({ message: 'You already have a pending request for this book' });
            return;
        }

        // Create borrow request
        const borrowRequest = await prisma.borrowedRequests.create({
            data: {
                bookId: bookId,
                userId: user.id,
                collegeId: user.collegeId,
                status: 'pending'
            },
        });

        res.json({ 
            message: 'Borrow request submitted successfully. Waiting for admin approval.',
            borrowRequest
        });
        return;

    } catch (error) {
        console.error('borrow book error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
};