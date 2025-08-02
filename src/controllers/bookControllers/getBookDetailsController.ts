/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { prisma } from "../../helpers/prismaDb";

export const getBookDetailsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = (req as any).params;
        const { collegeCode } = (req as any).query;

        if (!bookId) {
            res.status(400).json({
                success: false,
                message: "Book ID is required"
            });
            return;
        }

        // Get book details with copies and borrowing status
        const bookDetails = await prisma.book.findUnique({
            where: {
                id: bookId,
                College: {
                    code: collegeCode
                }
            },
            select: {
                id: true,
                bookNumber: true,
                bookName: true,
                summary: true,
                author: true,
                genre: true,
                bgColor: true,
                image: true,
                almirahNumber: true,
                shelfNumber: true,
                isOnline: true,
                onlineFileUrl: true,
                totalBooks: true,
                _count: {
                    select: {
                        copies: {
                            where: {
                                isBorrowed: false
                            }
                        }
                    }
                }
            },
        });

        if (!bookDetails) {
            res.status(404).json({
                success: false,
                message: "Book not found"
            });
            return;
        }

        res.status(201).json({
            book: bookDetails
        });
        return;

    } catch (error) {
        console.error("Error in getBookDetailsController:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
        return;
    }
};
