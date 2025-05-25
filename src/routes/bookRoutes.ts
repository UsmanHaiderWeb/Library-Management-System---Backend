/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { validateCreateBookBodyDataMiddleware } from '../middlewares/ValidateFormFields';
import { createBookController } from '../controllers/bookControllers/createBookController';
import { getAllBooksController } from '../controllers/bookControllers/getAllBooksController';
import { prisma } from '../helpers/prismaDb';

export const bookRouter = express.Router();

// create book
bookRouter.post('/create', validateCreateBookBodyDataMiddleware, adminAuthMiddleware, createBookController);

// delete book
bookRouter.post('/delete', async (_, res) => {
    const book = await prisma.book.delete({
        where: {
            id: '7ea7ba21-f345-49d8-9a70-85ee437931b3'
        }
    })
    res.status(201).json({deletedBook: book})
    return;
})

// get routes
bookRouter.get('/getAllBooks', adminAuthMiddleware, getAllBooksController);
