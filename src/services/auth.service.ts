import bcrypt from 'bcryptjs';
import { prisma } from '../helpers/prismaDb';
import { EmailService } from './email.service';

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

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await prisma.verificationToken.create({
            data: {
                token: otp,
                userId: type === 'user' ? target.id : undefined,
                adminId: type === 'admin' ? target.id : undefined,
                type: 'PASSWORD_RESET',
                expiresAt
            }
        });

        // Send email with OTP
        await EmailService.sendPasswordResetOTP(email, otp);

        return { otp, message: 'Password reset OTP generated and sent' };
    }

    /**
     * Verify OTP and reset password
     */
    static async resetPassword(params: {
        email: string;
        otp: string;
        newPassword: string;
        type: 'user' | 'admin';
    }) {
        const { email, otp, newPassword, type } = params;

        const target = type === 'user'
            ? await prisma.user.findUnique({ where: { email } })
            : await prisma.admin.findUnique({ where: { email } });

        if (!target) throw new Error('User not found');

        const tokenRecord = await prisma.verificationToken.findFirst({
            where: {
                userId: type === 'user' ? target.id : undefined,
                adminId: type === 'admin' ? target.id : undefined,
                token: otp,
                type: 'PASSWORD_RESET',
                expiresAt: { gt: new Date() }
            }
        });

        if (!tokenRecord) {
            throw new Error('Invalid or expired OTP');
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
