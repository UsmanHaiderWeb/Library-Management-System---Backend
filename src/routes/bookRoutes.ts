import express from 'express';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { validateCreateBookBodyDataMiddleware } from '../middlewares/ValidateFormFields';
import { createBookController } from '../controllers/bookControllers/createBookController';
import { deleteBookController } from '../controllers/bookControllers/deleteBookController';
import { updateBookController } from '../controllers/bookControllers/updateBookController';

import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';
import { getDigitalFileController } from '../controllers/bookControllers/getDigitalFileController';
import { getBookDetailsController } from '../controllers/bookControllers/getBookDetailsController';
import { borrowBookController } from '../controllers/bookControllers/borrowBookController';
import { getPublicBooksController } from '../controllers/bookControllers/getPublicBooksController';
import { RequestHandler } from 'express';

export const bookRouter = express.Router();

// public routes
bookRouter.get('/all', getPublicBooksController as RequestHandler);
bookRouter.get('/getBookDetails/:bookId', getBookDetailsController as RequestHandler);

// Digital Access (Secure)
bookRouter.get('/digital/:bookId', studentAuthMiddleware, getDigitalFileController as RequestHandler);

// create book
bookRouter.post('/create',
    adminAuthMiddleware,
    validateCreateBookBodyDataMiddleware,
    createBookController as RequestHandler
);

// borrow book
bookRouter.post('/borrow/:bookId', studentAuthMiddleware, borrowBookController as RequestHandler);

// delete book
bookRouter.delete('/delete/:bookId', adminAuthMiddleware, deleteBookController as RequestHandler);

// update book
bookRouter.post('/update/:bookId',
    adminAuthMiddleware,
    validateCreateBookBodyDataMiddleware,
    updateBookController as RequestHandler
);