"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRouter = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const express_1 = __importDefault(require("express"));
const ValidateFormFields_1 = require("../middlewares/ValidateFormFields");
const adminSignupController_1 = require("../controllers/adminAuthControllers/adminSignupController");
const adminLoginController_1 = require("../controllers/adminAuthControllers/adminLoginController");
const adminAuthMiddleware_1 = require("../middlewares/adminAuthMiddleware");
const getAdminDetails_1 = require("../controllers/adminControllers/getAdminDetails");
const getAllUsers_1 = require("../controllers/studentControllers/getAllUsers");
const getAllBooksController_1 = require("../controllers/bookControllers/getAllBooksController");
const allBorrowBookRequestsController_1 = require("../controllers/bookControllers/allBorrowBookRequestsController");
const allBorrowBooksController_1 = require("../controllers/bookControllers/allBorrowBooksController");
const changeStatusForBorrowBookRequestController_1 = require("../controllers/bookControllers/changeStatusForBorrowBookRequestController");
const changeReturnStatusForBorrowedBookController_1 = require("../controllers/bookControllers/changeReturnStatusForBorrowedBookController");
const borrowedBooksHistoryController_1 = require("../controllers/bookControllers/borrowedBooksHistoryController");
const getImageKitAuthenticationTokens_1 = require("../controllers/getImageKitAuthenticationTokens");
const getDashboardStatsController_1 = require("../controllers/adminControllers/getDashboardStatsController");
const purchaseRequestController_1 = require("../controllers/userControllers/purchaseRequestController");
const updateUserRoleController_1 = require("../controllers/adminControllers/updateUserRoleController");
const bulkImportController_1 = require("../controllers/adminControllers/bulkImportController");
const multer_1 = require("../helpers/multer");
exports.adminRouter = express_1.default.Router();
// Auth routes
exports.adminRouter.post('/signup', ValidateFormFields_1.validateAdminSignupFieldsMiddleware, adminSignupController_1.adminSignupController);
exports.adminRouter.post('/login', ValidateFormFields_1.validateLoginFieldsMiddleware, adminLoginController_1.adminLoginController);
// admin routes
exports.adminRouter.get('/getAdminDetails', adminAuthMiddleware_1.adminAuthMiddleware, getAdminDetails_1.getAdminDetailsController);
exports.adminRouter.get('/dashboard-stats', adminAuthMiddleware_1.adminAuthMiddleware, getDashboardStatsController_1.getDashboardStatsController);
// Import routes
exports.adminRouter.post('/import/books', adminAuthMiddleware_1.adminAuthMiddleware, multer_1.upload.single('file'), bulkImportController_1.bulkImportBooksController);
exports.adminRouter.post('/import/users', adminAuthMiddleware_1.adminAuthMiddleware, multer_1.upload.single('file'), bulkImportController_1.bulkImportUsersController);
// user - student related routes
exports.adminRouter.get('/getAllUsers', adminAuthMiddleware_1.adminAuthMiddleware, getAllUsers_1.getAllUsersController);
exports.adminRouter.patch('/update-user-role/:userId', adminAuthMiddleware_1.adminAuthMiddleware, updateUserRoleController_1.updateUserRoleController);
// Purchase Requests
exports.adminRouter.get('/purchase-requests', adminAuthMiddleware_1.adminAuthMiddleware, purchaseRequestController_1.getAllPurchaseRequestsController);
exports.adminRouter.post('/purchase-requests/:requestId/status', adminAuthMiddleware_1.adminAuthMiddleware, purchaseRequestController_1.updatePurchaseRequestStatusController);
// books related routes
exports.adminRouter.get('/getAllBooks', adminAuthMiddleware_1.adminAuthMiddleware, getAllBooksController_1.getAllBooksController);
exports.adminRouter.get('/all-borrow-requests', adminAuthMiddleware_1.adminAuthMiddleware, allBorrowBookRequestsController_1.allBorrowBookRequestsController);
exports.adminRouter.get('/borrowed-books/all', adminAuthMiddleware_1.adminAuthMiddleware, allBorrowBooksController_1.allBorrowBooksController);
exports.adminRouter.get('/borrowed-books/history', adminAuthMiddleware_1.adminAuthMiddleware, borrowedBooksHistoryController_1.borrowedBooksHistoryController);
exports.adminRouter.post('/borrow-requests/change-status/:borrowRequestId', adminAuthMiddleware_1.adminAuthMiddleware, changeStatusForBorrowBookRequestController_1.changeStatusForBorrowBookRequestController);
exports.adminRouter.post('/borrowed-books/:borrowedBookId/change-status', adminAuthMiddleware_1.adminAuthMiddleware, changeReturnStatusForBorrowedBookController_1.changeReturnStatusForBorrowedBookController);
// imageKit authentication route
exports.adminRouter.get('/imagekit-authentication-tokens', adminAuthMiddleware_1.adminAuthMiddleware, getImageKitAuthenticationTokens_1.getImageKitAuthenticationTokens);
