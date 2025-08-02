/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { validateCreateBookBodyDataMiddleware } from '../middlewares/ValidateFormFields';
import { createBookController } from '../controllers/bookControllers/createBookController';
import { prisma } from '../helpers/prismaDb';
import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';
import { borrowBookController } from '../controllers/bookControllers/borrowBookController';
import { getBookDetailsController } from '../controllers/bookControllers/getBookDetailsController';

export const bookRouter = express.Router();



// public routes
bookRouter.get('/getBookDetails/:bookId', getBookDetailsController);

// create book
bookRouter.post('/create', validateCreateBookBodyDataMiddleware, adminAuthMiddleware, createBookController);

// borrow book
bookRouter.post('/borrow/:bookId', studentAuthMiddleware, borrowBookController);

// delete book
bookRouter.post('/delete', async (_, res) => {
    const book = await prisma.book.delete({
        where: {
            id: '642de1e0-336a-499c-99e2-a660acf681f4'
        }
    })
    res.status(201).json({deletedBook: book})
    return;
})