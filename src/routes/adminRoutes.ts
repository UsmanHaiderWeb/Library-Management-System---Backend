/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { validateLoginFieldsMiddleware, validateAdminSignupFieldsMiddleware } from '../middlewares/ValidateFormFields';
import { adminSignupController } from '../controllers/adminAuthControllers/adminSignupController';
import { adminLoginController } from '../controllers/adminAuthControllers/adminLoginController';

export const adminRouter = express.Router();

// Auth routes
adminRouter.post('/signup', validateAdminSignupFieldsMiddleware, adminSignupController);
adminRouter.post('/login', validateLoginFieldsMiddleware, adminLoginController);