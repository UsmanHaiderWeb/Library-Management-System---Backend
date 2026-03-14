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
exports.loginController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const prismaDb_1 = require("../../helpers/prismaDb");
const redisClient_1 = require("../../helpers/redisClient");
// Login controller
const loginController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { email, password } = req.body;
        // Find user
        const user = yield prismaDb_1.prisma.user.findUnique({
            where: { email },
            include: {
                College: true
            }
        });
        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        // Check password
        const isMatch = yield bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            collegeCode: (_a = user.College) === null || _a === void 0 ? void 0 : _a.code,
            isEmailVerified: user === null || user === void 0 ? void 0 : user.isEmailVerified
        }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '2h' });
        // check: does the email of the user is validated
        if (!user.isEmailVerified) {
            // generate an otp code and email the code to the user
            const code = Math.floor(Math.random() * 900000) + 100000;
            // add the code to the database
            const generatedVerificationCodeDocument = yield prismaDb_1.prisma.verificationToken.create({
                data: {
                    token: code.toString(),
                    type: 'EMAIL_VERIFICATION',
                    userId: user.id,
                    expiresAt: new Date(Date.now() + (60 * 60 * 2))
                }
            });
            // store the token in redis
            yield redisClient_1.redisClient.hset(`user:${user.id}:code`, {
                code: code.toString(),
                id: generatedVerificationCodeDocument.id
            });
            yield redisClient_1.redisClient.expire(`user:${user.id}:code`, 60 * 60 * 2);
            // send the response
            res.status(200).json({
                message: 'An email has been sent to you to verify your email',
                temporaryToken: token
            });
            return;
        }
        // store the token in redis
        yield redisClient_1.redisClient.set(`user:${user.id}:token`, token, 'EX', 60 * 60 * 24 * 7);
        // send the response
        res.status(201).json({
            message: 'Login successful',
            token,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.loginController = loginController;
