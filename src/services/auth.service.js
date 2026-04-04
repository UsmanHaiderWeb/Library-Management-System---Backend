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
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prismaDb_1 = require("../helpers/prismaDb");
const email_service_1 = require("./email.service");
const config_1 = require("../config");
class AuthService {
    /**
     * Generate a password reset token (OTP)
     */
    static requestPasswordReset(email, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const target = type === 'user'
                ? yield prismaDb_1.prisma.user.findUnique({ where: { email } })
                : yield prismaDb_1.prisma.admin.findUnique({ where: { email } });
            if (!target) {
                throw new Error('User not found');
            }
            // Check rate limits
            const now = new Date();
            const oneDayMs = 24 * 60 * 60 * 1000;
            // Reset count if last retry was more than 24 hours ago
            if (target.passwordResetLastRetry && (now.getTime() - target.passwordResetLastRetry.getTime()) > oneDayMs) {
                target.passwordResetRetries = 0;
            }
            if (target.passwordResetRetries >= 3) {
                throw new Error('You have reached the maximum number of password reset attempts for today');
            }
            // Generate token
            const token = crypto_1.default.randomUUID();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
            yield prismaDb_1.prisma.verificationToken.create({
                data: {
                    token,
                    userId: type === 'user' ? target.id : undefined,
                    adminId: type === 'admin' ? target.id : undefined,
                    type: 'PASSWORD_RESET',
                    expiresAt
                }
            });
            // Update rate limit counts
            if (type === 'user') {
                yield prismaDb_1.prisma.user.update({
                    where: { id: target.id },
                    data: {
                        passwordResetRetries: target.passwordResetRetries + 1,
                        passwordResetLastRetry: now
                    }
                });
            }
            else {
                yield prismaDb_1.prisma.admin.update({
                    where: { id: target.id },
                    data: {
                        passwordResetRetries: target.passwordResetRetries + 1,
                        passwordResetLastRetry: now
                    }
                });
            }
            // Send email with Link
            const resetLink = `${config_1.config.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}&type=${type}`;
            yield email_service_1.EmailService.sendPasswordResetLink(email, resetLink);
            return { message: 'Password reset link sent to your email' };
        });
    }
    /**
     * Verify OTP and reset password
     */
    static resetPassword(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, token, newPassword, type } = params;
            const target = type === 'user'
                ? yield prismaDb_1.prisma.user.findUnique({ where: { email } })
                : yield prismaDb_1.prisma.admin.findUnique({ where: { email } });
            if (!target)
                throw new Error('User not found');
            const tokenRecord = yield prismaDb_1.prisma.verificationToken.findFirst({
                where: {
                    userId: type === 'user' ? target.id : undefined,
                    adminId: type === 'admin' ? target.id : undefined,
                    token: token,
                    type: 'PASSWORD_RESET',
                    expiresAt: { gt: new Date() }
                }
            });
            if (!tokenRecord) {
                throw new Error('Invalid or expired reset token');
            }
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash(newPassword, salt);
            if (type === 'user') {
                yield prismaDb_1.prisma.user.update({
                    where: { id: target.id },
                    data: { password: hashedPassword }
                });
            }
            else {
                yield prismaDb_1.prisma.admin.update({
                    where: { id: target.id },
                    data: { password: hashedPassword }
                });
            }
            yield prismaDb_1.prisma.verificationToken.delete({
                where: { id: tokenRecord.id }
            });
            return { message: 'Password reset successful' };
        });
    }
}
exports.AuthService = AuthService;
