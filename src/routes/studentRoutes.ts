import express from 'express';
import { signupController as studentSignupController } from '../controllers/studentAuthControllers/signupController';
import { validateLoginFieldsMiddleware, validateSignupFieldsMiddleware, validateVerificationCodeMiddleware as validateVerificationCode } from '../middlewares/ValidateFormFields';
import { loginController as studentLoginController } from '../controllers/studentAuthControllers/loginController';
import { verifyEmailController as studentEmailVerificationController } from '../controllers/studentAuthControllers/verifyEmailController';
import { getUserDetailsController } from '../controllers/studentControllers/getUserDetailsController';
import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';
import { requestPasswordResetController, resetPasswordController } from '../controllers/authControllers/passwordResetController';

import { createPurchaseRequestController } from '../controllers/userControllers/purchaseRequestController';

export const studentRouter = express.Router();

// Auth routes
studentRouter.post('/signup', validateSignupFieldsMiddleware, studentSignupController);
studentRouter.post('/login', validateLoginFieldsMiddleware, studentLoginController);
studentRouter.post('/verify-email', validateVerificationCode, studentEmailVerificationController);

// Password Reset
studentRouter.post('/forgot-password', requestPasswordResetController);
studentRouter.post('/reset-password', resetPasswordController);

// Purchase Requests
studentRouter.post('/purchase-request', studentAuthMiddleware, createPurchaseRequestController as any);

// detail routes
studentRouter.get('/getUserDetails', studentAuthMiddleware, getUserDetailsController);