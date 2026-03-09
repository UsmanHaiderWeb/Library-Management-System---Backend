import nodemailer from 'nodemailer';
import { config } from '../config';

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
            console.warn('Email credentials not set. Skipping email send.');
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
            console.error('Email send error:', error);
        }
    }

    /**
     * Send OTP for Password Reset
     */
    static async sendPasswordResetOTP(email: string, otp: string) {
        const html = `
      <h1>Password Reset Request</h1>
      <p>Your OTP for password reset is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 15 minutes.</p>
    `;
        await this.sendEmail(email, 'LMS - Password Reset OTP', html);
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
