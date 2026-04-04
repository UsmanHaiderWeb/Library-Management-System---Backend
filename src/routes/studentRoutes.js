"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentRouter = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const express_1 = __importDefault(require("express"));
const signupController_1 = require("../controllers/studentAuthControllers/signupController");
const ValidateFormFields_1 = require("../middlewares/ValidateFormFields");
const loginController_1 = require("../controllers/studentAuthControllers/loginController");
const logoutController_1 = require("../controllers/studentAuthControllers/logoutController");
const verifyEmailController_1 = require("../controllers/studentAuthControllers/verifyEmailController");
const getUserDetailsController_1 = require("../controllers/studentControllers/getUserDetailsController");
const updateProfileController_1 = require("../controllers/studentControllers/updateProfileController");
const changePasswordController_1 = require("../controllers/studentAuthControllers/changePasswordController");
const wishlistController_1 = require("../controllers/studentControllers/wishlistController");
const reviewController_1 = require("../controllers/studentControllers/reviewController");
const notificationController_1 = require("../controllers/studentControllers/notificationController");
const studentAuthMiddleware_1 = require("../middlewares/studentAuthMiddleware");
const passwordResetController_1 = require("../controllers/authControllers/passwordResetController");
const purchaseRequestController_1 = require("../controllers/userControllers/purchaseRequestController");
exports.studentRouter = express_1.default.Router();
// Auth routes
exports.studentRouter.post('/signup', ValidateFormFields_1.validateSignupFieldsMiddleware, signupController_1.signupController);
exports.studentRouter.post('/login', ValidateFormFields_1.validateLoginFieldsMiddleware, loginController_1.loginController);
exports.studentRouter.post('/logout', studentAuthMiddleware_1.studentAuthMiddleware, logoutController_1.logoutController);
exports.studentRouter.post('/verify-email', ValidateFormFields_1.validateVerificationCodeMiddleware, verifyEmailController_1.verifyEmailController);
// Password Reset
exports.studentRouter.post('/forgot-password', passwordResetController_1.requestPasswordResetController);
exports.studentRouter.post('/reset-password', passwordResetController_1.resetPasswordController);
// Purchase Requests
exports.studentRouter.post('/purchase-request', studentAuthMiddleware_1.studentAuthMiddleware, purchaseRequestController_1.createPurchaseRequestController);
// detail routes
exports.studentRouter.get('/getUserDetails', studentAuthMiddleware_1.studentAuthMiddleware, getUserDetailsController_1.getUserDetailsController);
exports.studentRouter.put('/profile', studentAuthMiddleware_1.studentAuthMiddleware, updateProfileController_1.updateProfileController);
exports.studentRouter.post('/change-password', studentAuthMiddleware_1.studentAuthMiddleware, changePasswordController_1.changePasswordController);
// Wishlist
exports.studentRouter.post('/wishlist/toggle', studentAuthMiddleware_1.studentAuthMiddleware, wishlistController_1.toggleSavedBookController);
exports.studentRouter.get('/wishlist', studentAuthMiddleware_1.studentAuthMiddleware, wishlistController_1.getWishlistController);
// Reviews
exports.studentRouter.post('/reviews', studentAuthMiddleware_1.studentAuthMiddleware, reviewController_1.addReviewController);
exports.studentRouter.get('/books/:bookId/reviews', reviewController_1.getBookReviewsController);
// Notifications
exports.studentRouter.get('/notifications', studentAuthMiddleware_1.studentAuthMiddleware, notificationController_1.getNotificationsController);
exports.studentRouter.put('/notifications/read-all', studentAuthMiddleware_1.studentAuthMiddleware, notificationController_1.markAllNotificationsAsReadController);
exports.studentRouter.put('/notifications/read/:id', studentAuthMiddleware_1.studentAuthMiddleware, notificationController_1.markNotificationAsReadController);
