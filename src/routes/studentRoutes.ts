/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { signupController } from '../controllers/studentAuthControllers/signupController';
import { validateLoginFieldsMiddleware, validateSignupFieldsMiddleware, validateVerificationCodeMiddleware } from '../middlewares/ValidateFormFields';
import { loginController } from '../controllers/studentAuthControllers/loginController';
import { verifyEmailController } from '../controllers/studentAuthControllers/verifyEmailController';
import { getUserDetailsController } from '../controllers/userControllers/getUserDetailsController';
import { prisma } from '../helpers/prismaDb';
import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';

export const studentRouter = express.Router();

// Auth routes
studentRouter.post('/signup', validateSignupFieldsMiddleware, signupController);
studentRouter.post('/login', validateLoginFieldsMiddleware, loginController);
studentRouter.post('/verify-email', validateVerificationCodeMiddleware, verifyEmailController);
studentRouter.get('/getUserDetails', studentAuthMiddleware, getUserDetailsController);

studentRouter.get('/test', async (req, res) => {
    let college;

    try {
        await prisma.$transaction(async (prisma) => {
            // Update user's email verification status
            college = await prisma.college.findFirst({
                where: {
                    code: 'GICCL'
                },
            });

            // Delete the used verification token
            await prisma.verificationToken.findFirst({
                where: {
                    id: '46'
                }
            });
        })

        res.json({ college });
        
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});