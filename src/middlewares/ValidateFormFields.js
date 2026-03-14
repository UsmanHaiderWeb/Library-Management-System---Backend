"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreateBookBodyDataMiddleware = exports.validateVerificationCodeMiddleware = exports.validateAdminSignupFieldsMiddleware = exports.validateSignupFieldsMiddleware = exports.validateLoginFieldsMiddleware = void 0;
const express_validator_1 = require("express-validator");
// Validation login middleware
exports.validateLoginFieldsMiddleware = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please enter a valid email'),
    (0, express_validator_1.body)('password').notEmpty().withMessage('Password is required'),
    (0, express_validator_1.body)('collegeCode').notEmpty().withMessage('College Code is required'),
];
// Validation signup middleware
exports.validateSignupFieldsMiddleware = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please enter a valid email'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('studentId').notEmpty().withMessage('Student ID is required'),
    (0, express_validator_1.body)('collegeCode').notEmpty().withMessage('College Code is required'),
];
exports.validateAdminSignupFieldsMiddleware = [
    (0, express_validator_1.body)('email').isEmail().withMessage('Please enter a valid email'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('collegeCode').notEmpty().withMessage('College Code is required'),
];
// Validation email verification middleware
exports.validateVerificationCodeMiddleware = [
    (0, express_validator_1.body)('verificationCode')
        .isLength({ min: 6, max: 6 })
        .withMessage('Verification code must be exactly 6 digits')
        .isNumeric()
        .withMessage('Verification code must contain only numbers'),
];
// validate create book body data
const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
const requiredStringField = (field, label) => (0, express_validator_1.body)(field)
    .notEmpty().withMessage(`${label} is required`)
    .isString().withMessage(`${label} must be a string`);
exports.validateCreateBookBodyDataMiddleware = [
    (0, express_validator_1.body)('bookNumber').notEmpty().withMessage('Book number is required'),
    requiredStringField('bookName', 'Book name'),
    requiredStringField('summary', 'Book summary'),
    requiredStringField('author', 'Author name'),
    requiredStringField('genre', 'Genre'),
    requiredStringField('image', 'Image'),
    (0, express_validator_1.body)('bgColor')
        .notEmpty().withMessage('Background color is required')
        .matches(hexColorRegex).withMessage('Background color must be a valid hex code'),
    (0, express_validator_1.body)('totalBooks')
        .isInt({ min: 1 }).withMessage('Total books count must be at least 1'),
    (0, express_validator_1.body)('almirahNumber')
        .isInt({ min: 1 }).withMessage('Almirah Number must be at least 1'),
    (0, express_validator_1.body)('shelfNumber')
        .isInt({ min: 1 }).withMessage('Shelf Number must be at least 1'),
    (0, express_validator_1.body)('isOnline')
        .optional()
        .isBoolean().withMessage('Online status must be a boolean'),
    (0, express_validator_1.body)('onlineFileUrl')
        .optional()
];
