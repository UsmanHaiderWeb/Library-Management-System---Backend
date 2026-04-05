import express, { RequestHandler } from 'express';
import { signupController as studentSignupController } from '../controllers/studentAuthControllers/signupController';
import { validateLoginFieldsMiddleware, validateSignupFieldsMiddleware, validateVerificationCodeMiddleware as validateVerificationCode } from '../middlewares/ValidateFormFields';
import { loginController as studentLoginController } from '../controllers/studentAuthControllers/loginController';
import { logoutController as studentLogoutController } from '../controllers/studentAuthControllers/logoutController';
import { verifyEmailController as studentEmailVerificationController } from '../controllers/studentAuthControllers/verifyEmailController';
import { getUserDetailsController } from '../controllers/studentControllers/getUserDetailsController';
import { updateProfileController } from '../controllers/studentControllers/updateProfileController';
import { changePasswordController } from '../controllers/studentAuthControllers/changePasswordController';
import { toggleSavedBookController, getWishlistController } from '../controllers/studentControllers/wishlistController';
import { addReviewController, getBookReviewsController, getMyReviewsController, deleteReviewController } from '../controllers/studentControllers/reviewController';
import { getNotificationsController, markNotificationAsReadController, markAllNotificationsAsReadController } from '../controllers/studentControllers/notificationController';
import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';
import { requestPasswordResetController, resetPasswordController } from '../controllers/authControllers/passwordResetController';
import { resendVerificationCodeController } from '../controllers/studentAuthControllers/resendVerificationController';

import { createPurchaseRequestController } from '../controllers/userControllers/purchaseRequestController';
import { authRateLimiter } from '../middlewares/rateLimiter';
import { requestRenewalController, getMyFinesController, getMyRenewalRequestsController } from '../controllers/bookControllers/renewalController';
import { joinWaitlistController, cancelReservationController, getMyReservationsController, getWaitlistPositionController } from '../controllers/bookControllers/reservationController';
import { getNotificationPreferencesController, updateNotificationPreferencesController } from '../controllers/studentControllers/notificationPreferenceController';
import { uploadAvatarController, removeAvatarController } from '../controllers/studentControllers/avatarController';
import multer from 'multer';

const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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
studentRouter.post('/purchase-request', studentAuthMiddleware, createPurchaseRequestController as RequestHandler);

// detail routes
studentRouter.get('/getUserDetails', studentAuthMiddleware, getUserDetailsController);
studentRouter.put('/profile', studentAuthMiddleware, updateProfileController);
studentRouter.post('/change-password', studentAuthMiddleware, changePasswordController);

// Wishlist
studentRouter.post('/wishlist/toggle', studentAuthMiddleware, toggleSavedBookController);
studentRouter.get('/wishlist', studentAuthMiddleware, getWishlistController);

// Reviews
studentRouter.post('/reviews', studentAuthMiddleware, addReviewController);
studentRouter.get('/reviews/my', studentAuthMiddleware, getMyReviewsController);
studentRouter.delete('/reviews/:reviewId', studentAuthMiddleware, deleteReviewController);
studentRouter.get('/books/:bookId/reviews', getBookReviewsController);

// Renewals
studentRouter.post('/renew/:borrowedBookId', studentAuthMiddleware, requestRenewalController as RequestHandler);
studentRouter.get('/renewal-requests', studentAuthMiddleware, getMyRenewalRequestsController);

// Fines
studentRouter.get('/fines', studentAuthMiddleware, getMyFinesController);

// Reservations / Waitlist
studentRouter.post('/reserve/:bookId', studentAuthMiddleware, joinWaitlistController as RequestHandler);
studentRouter.delete('/reserve/:bookId', studentAuthMiddleware, cancelReservationController as RequestHandler);
studentRouter.get('/reservations', studentAuthMiddleware, getMyReservationsController);
studentRouter.get('/reserve/:bookId/position', studentAuthMiddleware, getWaitlistPositionController as RequestHandler);

// Notifications
studentRouter.get('/notifications', studentAuthMiddleware, getNotificationsController);
studentRouter.put('/notifications/read-all', studentAuthMiddleware, markAllNotificationsAsReadController);
studentRouter.put('/notifications/read/:id', studentAuthMiddleware, markNotificationAsReadController);

// Notification Preferences
studentRouter.get('/notification-preferences', studentAuthMiddleware, getNotificationPreferencesController);
studentRouter.put('/notification-preferences', studentAuthMiddleware, updateNotificationPreferencesController);

// Avatar
studentRouter.post('/avatar', studentAuthMiddleware, avatarUpload.single('avatar'), uploadAvatarController as RequestHandler);
studentRouter.delete('/avatar', studentAuthMiddleware, removeAvatarController as RequestHandler);