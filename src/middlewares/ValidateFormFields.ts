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
    body('phoneNumber')
        .optional()
        .isMobilePhone('any').withMessage('Please enter a valid phone number'),
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
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const requiredStringField = (field: string, label: string) =>
    body(field)
        .notEmpty().withMessage(`${label} is required`)
        .isString().withMessage(`${label} must be a string`);

export const validateCreateBookBodyDataMiddleware = [
    body('bookNumber').notEmpty().withMessage('Book number is required'),
    requiredStringField('bookName', 'Book name'),
    requiredStringField('summary', 'Book summary'),
    requiredStringField('author', 'Author name'),
    requiredStringField('genre', 'Genre'),
    requiredStringField('image', 'Image'),

    body('bgColor')
        .notEmpty().withMessage('Background color is required')
        .matches(hexColorRegex).withMessage('Background color must be a valid hex code'),

    body('totalBooks')
        .isInt({ min: 1 }).withMessage('Total books count must be at least 1'),

    body('almirahNumber')
        .isInt({ min: 1 }).withMessage('Almirah Number must be at least 1'),

    body('shelfNumber')
        .isInt({ min: 1 }).withMessage('Shelf Number must be at least 1'),

    body('isOnline')
        .optional()
        .isBoolean().withMessage('Online status must be a boolean'),

    body('onlineFileUrl')
        .optional()
];