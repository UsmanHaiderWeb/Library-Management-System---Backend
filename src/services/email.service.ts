import nodemailer from 'nodemailer';
import { config } from '../config';
import logger from '../helpers/logger';

export class EmailService {
    private static transporter = nodemailer.createTransport({
        host: config.EMAIL_HOST,
        port: parseInt(config.EMAIL_PORT),
        secure: false, // true for 465, false for other ports
        auth: {
            user: config.EMAIL_USER,
            pass: config.EMAIL_PASS,
        },
    });

    /**
     * Send a generic email
     */
    static async sendEmail(to: string, subject: string, html: string) {
        if (!config.EMAIL_USER || !config.EMAIL_PASS) {
            logger.warn('Email credentials not set. Skipping email send.');
            return;
        }

        try {
            await this.transporter.sendMail({
                from: `"Library Management System" <${config.EMAIL_USER}>`,
                to,
                subject,
                html,
            });
        } catch (error) {
            logger.error('Email send error:', error);
        }
    }

    /**
     * Send Link for Password Reset
     */
    static async sendPasswordResetLink(email: string, resetLink: string) {
        const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background-color:#007bff;color:#fff;text-decoration:none;border-radius:5px;">Reset Password</a>
      <p>Or copy this link to your browser: <br/>${resetLink}</p>
      <p>This link will expire in 15 minutes.</p>
    `;
        await this.sendEmail(email, 'LMS - Password Reset Link', html);
    }

    /**
     * Send Verification Code for Signup
     */
    static async sendVerificationCode(email: string, code: string) {
        const html = `
      <h1>Welcome to LMS</h1>
      <p>Thank you for signing up. Your verification code is: <strong>${code}</strong></p>
      <p>Please enter this code on the verification page.</p>
    `;
        await this.sendEmail(email, 'LMS - Verify Your Email', html);
    }
}
