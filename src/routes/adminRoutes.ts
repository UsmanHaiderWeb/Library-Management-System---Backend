import express, { RequestHandler } from 'express';
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

import { getDashboardStatsController, getBorrowingTrendsController } from '../controllers/adminControllers/getDashboardStatsController';

import { getAllPurchaseRequestsController, updatePurchaseRequestStatusController } from '../controllers/userControllers/purchaseRequestController';

import { updateUserRoleController } from '../controllers/adminControllers/updateUserRoleController';

import { bulkImportBooksController, bulkImportUsersController } from '../controllers/adminControllers/bulkImportController';
import { upload } from '../helpers/multer';
import { getAllAccountRequestsController, approveAccountController, denyAccountController, getAdminUserDetailsController } from '../controllers/adminControllers/accountVerificationController';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { getAnalyticsController } from '../controllers/adminControllers/analyticsController';
import { getAllRenewalRequestsController, approveRenewalController, rejectRenewalController, getAllFinesController } from '../controllers/bookControllers/renewalController';
import { getOverdueSummaryController, triggerOverdueRemindersController } from '../controllers/adminControllers/overdueController';
import { getAuditLogsController, getAuditFiltersController } from '../controllers/adminControllers/auditController';

export const adminRouter = express.Router();

// Auth routes
adminRouter.post('/signup', authRateLimiter, validateAdminSignupFieldsMiddleware, adminSignupController);
adminRouter.post('/login', authRateLimiter, validateLoginFieldsMiddleware, adminLoginController);

// admin routes
adminRouter.get('/getAdminDetails', adminAuthMiddleware, getAdminDetailsController);
adminRouter.get('/dashboard-stats', adminAuthMiddleware, getDashboardStatsController);
adminRouter.get('/borrowing-trends', adminAuthMiddleware, getBorrowingTrendsController);
adminRouter.get('/analytics', adminAuthMiddleware, getAnalyticsController);

// Import routes
adminRouter.post('/import/books', adminAuthMiddleware, upload.single('file'), bulkImportBooksController as RequestHandler);
adminRouter.post('/import/users', adminAuthMiddleware, upload.single('file'), bulkImportUsersController as RequestHandler);

// user - student related routes
adminRouter.get('/getAllUsers', adminAuthMiddleware, getAllUsersController);
adminRouter.patch('/update-user-role/:userId', adminAuthMiddleware, updateUserRoleController as RequestHandler);

// Account verification routes
adminRouter.get('/getAllAccountRequests', adminAuthMiddleware, getAllAccountRequestsController);
adminRouter.post('/verify-account/:userId', adminAuthMiddleware, approveAccountController as RequestHandler);
adminRouter.post('/deny-account/:userId', adminAuthMiddleware, denyAccountController as RequestHandler);
adminRouter.get('/getUserDetails/:userId', adminAuthMiddleware, getAdminUserDetailsController as RequestHandler);

// Purchase Requests
adminRouter.get('/purchase-requests', adminAuthMiddleware, getAllPurchaseRequestsController);
adminRouter.post('/purchase-requests/:requestId/status', adminAuthMiddleware, updatePurchaseRequestStatusController as RequestHandler);

// books related routes
adminRouter.get('/getAllBooks', adminAuthMiddleware, getAllBooksController);
adminRouter.get('/all-borrow-requests', adminAuthMiddleware, allBorrowBookRequestsController);
adminRouter.get('/borrowed-books/all', adminAuthMiddleware, allBorrowBooksController);
adminRouter.get('/borrowed-books/history', adminAuthMiddleware, borrowedBooksHistoryController);
adminRouter.post('/borrow-requests/change-status/:borrowRequestId', adminAuthMiddleware, changeStatusForBorrowBookRequestController);
adminRouter.post('/borrowed-books/:borrowedBookId/change-status', adminAuthMiddleware, changeReturnStatusForBorrowedBookController);


// Renewal routes
adminRouter.get('/renewal-requests', adminAuthMiddleware, getAllRenewalRequestsController);
adminRouter.post('/renewal-requests/:requestId/approve', adminAuthMiddleware, approveRenewalController as RequestHandler);
adminRouter.post('/renewal-requests/:requestId/reject', adminAuthMiddleware, rejectRenewalController as RequestHandler);

// Fine routes
adminRouter.get('/fines', adminAuthMiddleware, getAllFinesController);

// Overdue routes
adminRouter.get('/overdue-summary', adminAuthMiddleware, getOverdueSummaryController);
adminRouter.post('/overdue-reminders/trigger', adminAuthMiddleware, triggerOverdueRemindersController);

// Audit log routes
adminRouter.get('/audit-logs', adminAuthMiddleware, getAuditLogsController);
adminRouter.get('/audit-logs/filters', adminAuthMiddleware, getAuditFiltersController);

// imageKit authentication route
adminRouter.get('/imagekit-authentication-tokens', adminAuthMiddleware, getImageKitAuthenticationTokens);