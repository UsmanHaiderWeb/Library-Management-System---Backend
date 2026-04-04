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
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordController = exports.requestPasswordResetController = void 0;
const auth_service_1 = require("../../services/auth.service");
const requestPasswordResetController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, type } = req.body; // type: 'user' | 'admin'
        if (!email || !type) {
            res.status(400).json({ message: 'Email and type are required' });
            return;
        }
        const result = yield auth_service_1.AuthService.requestPasswordReset(email, type);
        res.status(200).json(result);
    }
    catch (error) {
        if (error.message === 'User not found') {
            res.status(404).json({ message: error.message });
            return;
        }
        if (error.message.includes('rate limit') || error.message.includes('maximum number of password reset attempts')) {
            res.status(429).json({ message: error.message });
            return;
        }
        console.error('request reset error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.requestPasswordResetController = requestPasswordResetController;
const resetPasswordController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, token, newPassword, type } = req.body;
        // Backend will accept token but we might have also legacy otp. We'll map otp to token just in case.
        const resetToken = token || req.body.otp;
        if (!email || !resetToken || !newPassword || !type) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }
        const result = yield auth_service_1.AuthService.resetPassword({ email, token: resetToken, newPassword, type });
        res.status(200).json(result);
    }
    catch (error) {
        if (error.message === 'Invalid or expired reset token') {
            res.status(400).json({ message: error.message });
            return;
        }
        console.error('reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.resetPasswordController = resetPasswordController;
