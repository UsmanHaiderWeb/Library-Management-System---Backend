/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { validateLoginFieldsMiddleware, validateAdminSignupFieldsMiddleware } from '../middlewares/ValidateFormFields';
import { adminSignupController } from '../controllers/adminAuthControllers/adminSignupController';
import { adminLoginController } from '../controllers/adminAuthControllers/adminLoginController';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { getAdminDetailsController } from '../controllers/adminControllers/getAdminDetails';
import { getAllUsersController } from '../controllers/studentControllers/getAllUsers';
import { getAllBooksController } from '../controllers/bookControllers/getAllBooksController';
import { allBorrowBookRequestsController } from '../controllers/bookControllers/allBorrowBookRequestsController';
import { allBorrowBooksController } from '../controllers/bookControllers/allBorrowBooksController';
import { changeStatusForBorrowBookRequestController } from '../controllers/bookControllers/changeStatusForBorrowBookRequestController';

export const adminRouter = express.Router();

// admin auth routes
adminRouter.post('/signup', validateAdminSignupFieldsMiddleware, adminSignupController);
adminRouter.post('/login', validateLoginFieldsMiddleware, adminLoginController);

// admin routes
adminRouter.get('/getAdminDetails', adminAuthMiddleware, getAdminDetailsController);

// user - student related routes
adminRouter.get('/getAllUsers', adminAuthMiddleware, getAllUsersController);

// books related routes
adminRouter.get('/getAllBooks', adminAuthMiddleware, getAllBooksController);
adminRouter.get('/all-borrow-requests', adminAuthMiddleware, allBorrowBookRequestsController);
adminRouter.get('/all-borrowed-books', adminAuthMiddleware, allBorrowBooksController);
adminRouter.post('/borrow-requests/change-status/:borrowRequestId', adminAuthMiddleware, changeStatusForBorrowBookRequestController);
