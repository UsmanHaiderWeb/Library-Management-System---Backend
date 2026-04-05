/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { prisma } from '../../helpers/prismaDb';


export const createBookController = async (req: Request, res: Response): Promise<void> => {
    const admin = (req as RequestWithAdmin).admin;

    if (!admin) {
        res.status(401).json({ message: 'Unauthorized access' });
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
        isOnline = false,
        onlineFileUrl,
        almirahNumber,
        shelfNumber
    } = req.body;

    // check whether book with the same book number already exists
    const doesBookAlreadyExist = await prisma.book.findFirst({
        where: {
            bookNumber,
            collegeId: admin?.collegeId,
        },
        select: {
            id: true,
        }
    })
    if (doesBookAlreadyExist) {
        res.status(409).json({ message: "A book with the same number already exists" });
        return;
    }

    try {
        const book = await prisma.book.create({
            data: {
                bookNumber,
                isbn: isbn || null,
                bookName,
                summary,
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
                    create: Array.from({ length: Number(totalBooks) }, () => ({
                        isBorrowed: false
                    }))
                }
            },
            include: { copies: true }
        });

        res.status(201).json({ message: 'Book created successfully', book });

    } catch (error: any) {
        console.error('Create book error:', error?.message || error);
        res.status(500).json({ message: 'Internal server error' });
    }
    return;
};
