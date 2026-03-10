/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { validateCreateBookBodyDataMiddleware } from '../middlewares/ValidateFormFields';
import { createBookController } from '../controllers/bookControllers/createBookController';
import { deleteBookController } from '../controllers/bookControllers/deleteBookController';
import { updateBookController } from '../controllers/bookControllers/updateBookController';

import { prisma } from '../helpers/prismaDb';
import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';
import { getDigitalFileController } from '../controllers/bookControllers/getDigitalFileController';

export const bookRouter = express.Router();

// public routes
bookRouter.get('/getBookDetails/:bookId', getBookDetailsController);

// Digital Access (Secure)
bookRouter.get('/digital/:bookId', studentAuthMiddleware, getDigitalFileController);

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