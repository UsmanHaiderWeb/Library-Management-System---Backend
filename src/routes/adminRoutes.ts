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
import { changeReturnStatusForBorrowedBookController } from '../controllers/bookControllers/changeReturnStatusForBorrowedBookController';
import { borrowedBooksHistoryController } from '../controllers/bookControllers/borrowedBooksHistoryController';
import { getImageKitAuthenticationTokens } from '../controllers/getImageKitAuthenticationTokens';

import { getDashboardStatsController } from '../controllers/adminControllers/getDashboardStatsController';

import { getAllPurchaseRequestsController, updatePurchaseRequestStatusController } from '../controllers/userControllers/purchaseRequestController';

import { updateUserRoleController } from '../controllers/adminControllers/updateUserRoleController';

import { bulkImportBooksController, bulkImportUsersController } from '../controllers/adminControllers/bulkImportController';
import { upload } from '../helpers/multer';

export const adminRouter = express.Router();

// Auth routes
adminRouter.post('/signup', validateAdminSignupFieldsMiddleware, adminSignupController);
adminRouter.post('/login', validateLoginFieldsMiddleware, adminLoginController);

// admin routes
adminRouter.get('/getAdminDetails', adminAuthMiddleware, getAdminDetailsController);
adminRouter.get('/dashboard-stats', adminAuthMiddleware, getDashboardStatsController);

// Import routes
adminRouter.post('/import/books', adminAuthMiddleware, upload.single('file'), bulkImportBooksController as any);
adminRouter.post('/import/users', adminAuthMiddleware, upload.single('file'), bulkImportUsersController as any);

// user - student related routes
adminRouter.get('/getAllUsers', adminAuthMiddleware, getAllUsersController);
adminRouter.patch('/update-user-role/:userId', adminAuthMiddleware, updateUserRoleController as any);

// Purchase Requests
adminRouter.get('/purchase-requests', adminAuthMiddleware, getAllPurchaseRequestsController);
adminRouter.post('/purchase-requests/:requestId/status', adminAuthMiddleware, updatePurchaseRequestStatusController as any);

// books related routes
adminRouter.get('/getAllBooks', adminAuthMiddleware, getAllBooksController);
adminRouter.get('/all-borrow-requests', adminAuthMiddleware, allBorrowBookRequestsController);
adminRouter.get('/borrowed-books/all', adminAuthMiddleware, allBorrowBooksController);
adminRouter.get('/borrowed-books/history', adminAuthMiddleware, borrowedBooksHistoryController);
adminRouter.post('/borrow-requests/change-status/:borrowRequestId', adminAuthMiddleware, changeStatusForBorrowBookRequestController);
adminRouter.post('/borrowed-books/:borrowedBookId/change-status', adminAuthMiddleware, changeReturnStatusForBorrowedBookController);


// imageKit authentication route
adminRouter.get('/imagekit-authentication-tokens', adminAuthMiddleware, getImageKitAuthenticationTokens);