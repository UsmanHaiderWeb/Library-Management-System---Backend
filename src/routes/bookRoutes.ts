/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { validateCreateBookBodyDataMiddleware } from '../middlewares/ValidateFormFields';
import { createBookController } from '../controllers/bookControllers/createBookController';
import { deleteBookController } from '../controllers/bookControllers/deleteBookController';
import { updateBookController } from '../controllers/bookControllers/updateBookController';

import { prisma } from '../helpers/prismaDb';
import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';
import { borrowBookController } from '../controllers/bookControllers/borrowBookController';
import { getBookDetailsController } from '../controllers/bookControllers/getBookDetailsController';

export const bookRouter = express.Router();



// public routes
bookRouter.get('/getBookDetails/:bookId', getBookDetailsController);

// create book
bookRouter.post('/create',
    adminAuthMiddleware,
    validateCreateBookBodyDataMiddleware,
    createBookController
);

// borrow book
bookRouter.post('/borrow/:bookId', studentAuthMiddleware, borrowBookController);

// delete book
bookRouter.delete('/delete/:bookId', adminAuthMiddleware, deleteBookController);

// update book
bookRouter.post('/update/:bookId',
    adminAuthMiddleware,
    validateCreateBookBodyDataMiddleware,
    updateBookController
);