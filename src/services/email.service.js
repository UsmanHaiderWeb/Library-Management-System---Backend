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
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
class EmailService {
    /**
     * Send a generic email
     */
    static sendEmail(to, subject, html) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!config_1.config.EMAIL_USER || !config_1.config.EMAIL_PASS) {
                console.warn('Email credentials not set. Skipping email send.');
                return;
            }
            try {
                yield this.transporter.sendMail({
                    from: `"Library Management System" <${config_1.config.EMAIL_USER}>`,
                    to,
                    subject,
                    html,
                });
            }
            catch (error) {
                console.error('Email send error:', error);
            }
        });
    }
    /**
     * Send Link for Password Reset
     */
    static sendPasswordResetLink(email, resetLink) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background-color:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p>Or copy this link to your browser: <br/>${resetLink}</p>
      <p>This link will expire in 15 minutes.</p>
    `;
            yield this.sendEmail(email, 'LMS - Password Reset Link', html);
        });
    }
    /**
     * Send Verification Code for Signup
     */
    static sendVerificationCode(email, code) {
        return __awaiter(this, void 0, void 0, function* () {
            const html = `
      <h1>Welcome to LMS</h1>
      <p>Thank you for signing up. Your verification code is: <strong>${code}</strong></p>
      <p>Please enter this code on the verification page.</p>
    `;
            yield this.sendEmail(email, 'LMS - Verify Your Email', html);
        });
    }
}
exports.EmailService = EmailService;
EmailService.transporter = nodemailer_1.default.createTransport({
    host: config_1.config.EMAIL_HOST,
    port: parseInt(config_1.config.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
        user: config_1.config.EMAIL_USER,
        pass: config_1.config.EMAIL_PASS,
    },
});
