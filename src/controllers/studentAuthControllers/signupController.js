"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signupController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const prismaDb_1 = require("../../helpers/prismaDb");
const redisClient_1 = require("../../helpers/redisClient");
const email_service_1 = require("../../services/email.service");
// Signup controller
const signupController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { email, password, name, studentId, phoneNumber, collegeCode } = req.body;
        // Check if college exists
        const college = yield prismaDb_1.prisma.college.findUnique({
            where: { code: collegeCode }
        });
        if (!college) {
            res.status(400).json({ message: 'Invalid college code.' });
            return;
        }
        // Check if user already exists
        const existingUser = yield prismaDb_1.prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        // Hash password
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        const getYear = () => {
            const date = new Date();
            return date.getFullYear();
        };
        yield prismaDb_1.prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // Create user
            const user = yield prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    studentId,
                    batchYear: getYear(),
                    phoneNumber,
                    isEmailVerified: false,
                    isVerifiedByAdmin: false,
                    collegeId: college.id
                }
            });
            // Generate JWT token to verify that the user who enters the otp is the actual user
            const token = jsonwebtoken_1.default.sign({
                userId: user.id,
                email: user.email,
                collegeCode: college.code
            }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });
            // generate an otp code and email the code to the user
            const code = Math.floor(Math.random() * 900000) + 100000;
            // add the code to the database
            const generatedVerificationCodeDocument = yield prisma.verificationToken.create({
                data: {
                    token: code.toString(),
                    type: 'EMAIL_VERIFICATION',
                    userId: user.id,
                    expiresAt: new Date(Date.now() + (60 * 60 * 2))
                }
            });
            // store the token and code in redis
            // await redisClient.set(`user:${user.id}:token`, code.toString(), 'EX', 60 * 60 * 2);
            yield redisClient_1.redisClient.hset(`user:${user.id}:code`, {
                code: code.toString(),
                id: generatedVerificationCodeDocument.id
            });
            yield redisClient_1.redisClient.expire(`user:${user.id}:code`, 60 * 60 * 2);
            // send the verification email
            yield email_service_1.EmailService.sendVerificationCode(email, code.toString());
            // send the response back to frontend
            res.status(201).json({
                message: 'User created successfully. Verification email sent.',
                temporaryToken: token,
            });
        }));
        return;
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.signupController = signupController;
