import { Request, Response } from 'express';
import { prisma } from '../../helpers/prismaDb';
import { validationResult } from 'express-validator';
import { RequestWithAdmin } from '../../helpers/interfaces';


interface CreateBookRequest {
    bookNumber: string;
    bookName: string;
    author: string;
    genre: string;
    image: string;
    bgColor: string;
    totalBooks: number;
    isOnline?: boolean;
    onlineFileUrl?: string;
    almirahNumber: number
    shelfNumber: number
}


export const createBookController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        if (!admin) {
            res.status(401).json({ message: 'Unauthorized access' });
            return;
        }


        // validate form data
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.json({ errors: errors.array() });
            return;
        }


        const {
            bookNumber,
            bookName,
            author,
            genre,
            image,
            bgColor,
            totalBooks,
            isOnline = false,
            onlineFileUrl,
            almirahNumber,
            shelfNumber
        } = req.body as CreateBookRequest;


        // Validate online book requirements
        if (typeof isOnline != 'boolean') {
            res.status(400).json({
                message: 'Does this book is online available.'
            });
            return;
        }

        if (isOnline && !onlineFileUrl) {
            res.status(400).json({
                message: 'Online File Url is required for online books'
            });
            return;
        }


        // Create the book
        const book = await prisma.book.create({
            data: {
                bookName,
                bookNumber,
                author,
                genre,
                image,
                bgColor,
                totalBooks: Number(totalBooks),
                almirahNumber: Number(almirahNumber),
                shelfNumber: Number(shelfNumber),
                isOnline,
                onlineFileUrl,
                collegeId: admin.collegeId,
                copies: {
                    create: Array(totalBooks).fill({}).map(() => ({
                        isBorrowed: false
                    }))
                }
            },
            include: {
                copies: true
            }
        });

        res.status(201).json({
            message: 'Book created successfully',
            book
        });
        return;

    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({
            message: 'Internal server error'
        });
        return;
    }
};
