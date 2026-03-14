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
exports.verifyEmailController = void 0;
const verifyToken_1 = require("../../helpers/verifyToken");
const prismaDb_1 = require("../../helpers/prismaDb");
const redisClient_1 = require("../../helpers/redisClient");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyEmailController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { verificationCode } = req.body;
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split('Bearer ')[1];
        if (!token) {
            res.status(401).json({
                message: 'Authentication token is required'
            });
            return;
        }
        // Verify the JWT token and get user ID
        const decodedUserData = (0, verifyToken_1.verifyToken)(token);
        if (!decodedUserData || !decodedUserData.userId || !decodedUserData.email || !decodedUserData.collegeCode) {
            res.status(401).json({
                message: 'Invalid or expired token'
            });
            return;
        }
        if (!verificationCode || verificationCode.length !== 6) {
            res.status(400).json({
                message: 'Please provide a valid 6-digit verification code'
            });
            return;
        }
        // Find the verification token in redis or in the database (if not present in redis)
        let verificationCodeFromDB;
        const verificationCodeDocumentFromRedis = yield redisClient_1.redisClient.hgetall(`user:${decodedUserData.userId}:code`);
        if (!verificationCodeDocumentFromRedis.code || !verificationCodeDocumentFromRedis.id || (verificationCodeDocumentFromRedis.code != verificationCode)) {
            verificationCodeFromDB = yield prismaDb_1.prisma.verificationToken.findFirst({
                where: {
                    userId: decodedUserData.userId,
                    token: verificationCode,
                    type: 'EMAIL_VERIFICATION',
                    expiresAt: {
                        gt: new Date() // Check if token hasn't expired
                    }
                }
            });
            if (!verificationCodeFromDB) {
                res.status(400).json({
                    message: 'Invalid or expired verification code'
                });
                return;
            }
        }
        yield prismaDb_1.prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            // Update user's email verification status
            yield prisma.user.update({
                where: {
                    id: decodedUserData.userId
                },
                data: {
                    isEmailVerified: true
                }
            });
            // Delete the used verification token
            if (verificationCodeDocumentFromRedis.id || verificationCodeFromDB.id) {
                yield prisma.verificationToken.delete({
                    where: {
                        id: verificationCodeDocumentFromRedis.id || verificationCodeFromDB.id,
                        userId: decodedUserData.userId
                    }
                });
            }
            yield redisClient_1.redisClient.del(`user:${decodedUserData.userId}:code`);
            // create new access token
            const accessToken = jsonwebtoken_1.default.sign({
                userId: decodedUserData.userId,
                email: decodedUserData.email,
                collegeCode: decodedUserData.collegeCode,
            }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
            yield redisClient_1.redisClient.set(`user:${decodedUserData.userId}:token`, accessToken);
            res.status(200).json({
                message: 'Email verified successfully',
                accessToken
            });
        }));
    }
    catch (error) {
        console.error('Error in verifyEmailController:', error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
    return;
});
exports.verifyEmailController = verifyEmailController;
