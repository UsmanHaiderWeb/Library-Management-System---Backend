/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { validateLoginFieldsMiddleware, validateAdminSignupFieldsMiddleware } from '../middlewares/ValidateFormFields';
import { adminSignupController } from '../controllers/adminAuthControllers/adminSignupController';
import { adminLoginController } from '../controllers/adminAuthControllers/adminLoginController';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { getAdminDetailsController } from '../controllers/adminControllers/getAdminDetails';

export const adminRouter = express.Router();

// admin auth routes
adminRouter.post('/signup', validateAdminSignupFieldsMiddleware, adminSignupController);
adminRouter.post('/login', validateLoginFieldsMiddleware, adminLoginController);

// admin routes
adminRouter.get('/getAdminDetails', adminAuthMiddleware, getAdminDetailsController);