import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../helpers/prismaDb';
import { EmailService } from './email.service';
import { config } from '../config';

export class AuthService {
    /**
     * Generate a password reset token (OTP)
     */
    static async requestPasswordReset(email: string, type: 'user' | 'admin') {
        const target = type === 'user'
            ? await prisma.user.findUnique({ where: { email } })
            : await prisma.admin.findUnique({ where: { email } });

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
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.verificationToken.create({
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
            await prisma.user.update({
                where: { id: target.id },
                data: {
                    passwordResetRetries: target.passwordResetRetries + 1,
                    passwordResetLastRetry: now
                }
            });
        } else {
            await prisma.admin.update({
                where: { id: target.id },
                data: {
                    passwordResetRetries: target.passwordResetRetries + 1,
                    passwordResetLastRetry: now
                }
            });
        }

        // Send email with Link
        const resetLink = `${config.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}&type=${type}`;
        await EmailService.sendPasswordResetLink(email, resetLink);

        return { message: 'Password reset link sent to your email' };
    }

    /**
     * Verify OTP and reset password
     */
    static async resetPassword(params: {
        email: string;
        token: string;
        newPassword: string;
        type: 'user' | 'admin';
    }) {
        const { email, token, newPassword, type } = params;

        const target = type === 'user'
            ? await prisma.user.findUnique({ where: { email } })
            : await prisma.admin.findUnique({ where: { email } });

        if (!target) throw new Error('User not found');

        const tokenRecord = await prisma.verificationToken.findFirst({
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

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        if (type === 'user') {
            await prisma.user.update({
                where: { id: target.id },
                data: { password: hashedPassword }
            });
        } else {
            await prisma.admin.update({
                where: { id: target.id },
                data: { password: hashedPassword }
            });
        }

        await prisma.verificationToken.delete({
            where: { id: tokenRecord.id }
        });

        return { message: 'Password reset successful' };
    }
}
