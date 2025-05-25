import { body } from "express-validator";


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

// validate create book body data
export const validateCreateBookBodyDataMiddleware = [
    body('bookNumber')
        .notEmpty().withMessage('Book number is required'),

    body('bookName')
        .notEmpty().withMessage('Book name is required')
        .isString().withMessage('Book name must be a string'),

    body('author')
        .notEmpty().withMessage('Author name is required')
        .isString().withMessage('Author name must be a string'),

    body('genre')
        .notEmpty().withMessage('Genre is required')
        .isString().withMessage('Genre must be a string'),

    body('image')
        .notEmpty().withMessage('Image URL is required')
        .isURL().withMessage('Image must be a valid URL'),

    body('bgColor')
        .notEmpty().withMessage('Background color is required')
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Background color must be a valid hex color (e.g., #FF0000)'),

    body('totalBooks')
        .isInt({ min: 1 }).withMessage('Total books count is required.'),

    body('almirahNumber')
        .isInt({ min: 1 }).withMessage('Almirah Number is required.'),

    body('shelfNumber')
        .isInt({ min: 1 }).withMessage('Shelf Number is required.'),

    body('isOnline')
        .isBoolean().withMessage('Online status must be a boolean value'),
];