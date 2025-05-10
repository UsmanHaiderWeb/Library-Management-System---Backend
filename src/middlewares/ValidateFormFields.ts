import { body, header } from "express-validator";


// Validation login middleware
export const validateLoginFieldsMiddleware = [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    body('collegeCode').notEmpty().withMessage('College Code is required'),
];

// Validation signup middleware
export const validateSignupFieldsMiddleware = [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').notEmpty().withMessage('Name is required'),
    body('studentId').notEmpty().withMessage('Student ID is required'),
    body('collegeCode').notEmpty().withMessage('College Code is required'),
];

export const validateAdminSignupFieldsMiddleware = [
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('name').notEmpty().withMessage('Name is required'),
    body('collegeCode').notEmpty().withMessage('College Code is required'),
];

// Validation email verification middleware
export const validateVerificationCodeMiddleware = [
    body('verificationCode')
        .isLength({ min: 6, max: 6 })
        .withMessage('Verification code must be exactly 6 digits')
        .isNumeric()
        .withMessage('Verification code must contain only numbers'),
];