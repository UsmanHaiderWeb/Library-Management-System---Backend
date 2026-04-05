/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { signupController as studentSignupController } from '../controllers/studentAuthControllers/signupController';
import { validateLoginFieldsMiddleware, validateSignupFieldsMiddleware, validateVerificationCodeMiddleware as validateVerificationCode } from '../middlewares/ValidateFormFields';
import { loginController as studentLoginController } from '../controllers/studentAuthControllers/loginController';
import { logoutController as studentLogoutController } from '../controllers/studentAuthControllers/logoutController';
import { verifyEmailController as studentEmailVerificationController } from '../controllers/studentAuthControllers/verifyEmailController';
import { getUserDetailsController } from '../controllers/studentControllers/getUserDetailsController';
import { updateProfileController } from '../controllers/studentControllers/updateProfileController';
import { changePasswordController } from '../controllers/studentAuthControllers/changePasswordController';
import { toggleSavedBookController, getWishlistController } from '../controllers/studentControllers/wishlistController';
import { addReviewController, getBookReviewsController } from '../controllers/studentControllers/reviewController';
import { getNotificationsController, markNotificationAsReadController, markAllNotificationsAsReadController } from '../controllers/studentControllers/notificationController';
import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';
import { requestPasswordResetController, resetPasswordController } from '../controllers/authControllers/passwordResetController';
import { resendVerificationCodeController } from '../controllers/studentAuthControllers/resendVerificationController';

import { createPurchaseRequestController } from '../controllers/userControllers/purchaseRequestController';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { requestRenewalController, getMyFinesController, getMyRenewalRequestsController } from '../controllers/bookControllers/renewalController';

export const studentRouter = express.Router();

// Auth routes
studentRouter.post('/signup', authRateLimiter, validateSignupFieldsMiddleware, studentSignupController);
studentRouter.post('/login', authRateLimiter, validateLoginFieldsMiddleware, studentLoginController);
studentRouter.post('/logout', studentAuthMiddleware, studentLogoutController);
studentRouter.post('/verify-email', validateVerificationCode, studentEmailVerificationController);
studentRouter.post('/resend-verification', resendVerificationCodeController);

// Password Reset
studentRouter.post('/forgot-password', requestPasswordResetController);
studentRouter.post('/reset-password', resetPasswordController);

// Purchase Requests
studentRouter.post('/purchase-request', studentAuthMiddleware, createPurchaseRequestController as any);

// detail routes
studentRouter.get('/getUserDetails', studentAuthMiddleware, getUserDetailsController);
studentRouter.put('/profile', studentAuthMiddleware, updateProfileController);
studentRouter.post('/change-password', studentAuthMiddleware, changePasswordController);

// Wishlist
studentRouter.post('/wishlist/toggle', studentAuthMiddleware, toggleSavedBookController);
studentRouter.get('/wishlist', studentAuthMiddleware, getWishlistController);

// Reviews
studentRouter.post('/reviews', studentAuthMiddleware, addReviewController);
studentRouter.get('/books/:bookId/reviews', getBookReviewsController);

// Renewals
studentRouter.post('/renew/:borrowedBookId', studentAuthMiddleware, requestRenewalController as any);
studentRouter.get('/renewal-requests', studentAuthMiddleware, getMyRenewalRequestsController);

// Fines
studentRouter.get('/fines', studentAuthMiddleware, getMyFinesController);

// Notifications
studentRouter.get('/notifications', studentAuthMiddleware, getNotificationsController);
studentRouter.put('/notifications/read-all', studentAuthMiddleware, markAllNotificationsAsReadController);
studentRouter.put('/notifications/read/:id', studentAuthMiddleware, markNotificationAsReadController);