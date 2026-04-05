import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../helpers/prismaDb';
import { config } from '../config';

export class AdminService {
    /**
     * Register a new admin
     */
    static async signup(data: { email: string; password: string; name: string; collegeCode: string }) {
        const { email, password, name, collegeCode } = data;

        // Check if college exists
        const college = await prisma.college.findUnique({
            where: { code: collegeCode }
        });

        if (!college) {
            throw new Error('Invalid college code.');
        }

        // Check if admin already exists
        const existingUser = await prisma.admin.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error('Admin already exists');
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await prisma.$transaction(async (tx) => {
            // Create admin
            const user = await tx.admin.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    collegeId: college.id
                }
            });

            const token = jwt.sign(
                {
                    adminId: user.id,
                    email: user.email,
                    collegeCode: college.code
                },
                config.JWT_SECRET,
                { expiresIn: '1h' }
            );

            return { user, token };
        });

        return result;
    }

    /**
     * Authenticate an admin
     */
    static async login(data: { email: string; password: string }) {
        const { email, password } = data;

        // Find admin
        const admin = await prisma.admin.findUnique({
            where: { email },
            include: {
                College: true
            }
        });

        if (!admin) {
            throw new Error('Invalid credentials');
        }

        // Check password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                adminId: admin.id,
                email: admin.email,
                collegeCode: admin.College?.code,
            },
            config.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return { admin, token };
    }

    /**
     * Get dashboard statistics for a college
     */
    static async getDashboardStats(collegeId: string) {
        const [totalBooks, totalStudents, pendingRequests, activeLoans] = await Promise.all([
            prisma.book.count({ where: { collegeId } }),
            prisma.user.count({ where: { collegeId } }),
            prisma.borrowedRequests.count({ where: { collegeId, status: 'pending' } }),
            prisma.borrowedBook.count({ where: { collegeId, status: 'borrowed' } })
        ]);

        return {
            totalBooks,
            totalStudents,
            pendingRequests,
            activeLoans
        };
    }

    /**
     * Get daily borrowing trends for the last N days
     */
    static async getBorrowingTrends(collegeId: string, days: number = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);

        const borrowedBooks = await prisma.borrowedBook.findMany({
            where: {
                collegeId,
                borrowedOn: { gte: startDate },
            },
            select: {
                borrowedOn: true,
            },
            orderBy: {
                borrowedOn: 'asc',
            },
        });

        // Group by date
        const dailyCounts: Record<string, number> = {};

        // Initialize all days to 0
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const key = date.toISOString().split('T')[0];
            dailyCounts[key] = 0;
        }

        // Count borrows per day
        for (const book of borrowedBooks) {
            const key = book.borrowedOn.toISOString().split('T')[0];
            if (dailyCounts[key] !== undefined) {
                dailyCounts[key]++;
            }
        }

        return Object.entries(dailyCounts).map(([date, count]) => ({
            time: date,
            value: count,
        }));
    }
}
