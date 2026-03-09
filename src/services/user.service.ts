import { prisma } from '../helpers/prismaDb';

export class UserService {
    /**
     * Get all users with advanced filtering and pagination
     */
    static async getAllUsers(params: {
        collegeId: string;
        pageNumber?: number;
        searchQuery?: string;
        isEmailVerified?: boolean;
        isVerifiedByAdmin?: boolean;
        hasActiveBorrows?: boolean;
        pageSize?: number;
    }) {
        const {
            collegeId,
            pageNumber = 0,
            searchQuery = '',
            isEmailVerified,
            isVerifiedByAdmin,
            hasActiveBorrows,
            pageSize = 20,
        } = params;

        const whereClause: any = {
            collegeId,
        };

        const andConditions: any[] = [];

        if (searchQuery.trim() !== '') {
            andConditions.push({
                OR: [
                    { name: { contains: searchQuery } },
                    { email: { contains: searchQuery } },
                    { studentId: { contains: searchQuery } },
                ],
            });
        }

        if (isEmailVerified !== undefined) {
            andConditions.push({ isEmailVerified });
        }

        if (isVerifiedByAdmin !== undefined) {
            andConditions.push({ isVerifiedByAdmin });
        }

        if (hasActiveBorrows) {
            andConditions.push({
                borrowedBooks: {
                    some: {
                        status: 'borrowed',
                    },
                },
            });
        }

        if (andConditions.length > 0) {
            whereClause.AND = andConditions;
        }

        const usersCount = await prisma.user.count({
            where: whereClause,
        });

        const users = await prisma.user.findMany({
            where: whereClause,
            skip: pageNumber * pageSize,
            take: pageSize,
            select: {
                id: true,
                name: true,
                studentId: true,
                email: true,
                phoneNumber: true,
                isEmailVerified: true,
                isVerifiedByAdmin: true,
                createdAt: true,
                _count: {
                    select: {
                        borrowedBooks: {
                            where: {
                                status: 'borrowed'
                            }
                        },
                        borrowedRequests: true,
                    },
                },
            },
        });

        return {
            users,
            totalPages: Math.ceil(usersCount / pageSize),
            totalCount: usersCount,
        };
    }

    /**
     * Get exhaustive user details including history
     */
    static async getUserDetails(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                studentId: true,
                phoneNumber: true,
                isEmailVerified: true,
                isVerifiedByAdmin: true,
                collegeId: true,
            }
        });

        if (!user) return null;

        const borrowedBooks = await prisma.borrowedBook.findMany({
            where: { userId },
            include: {
                bookCopy: {
                    include: {
                        book: true,
                    },
                },
            },
            orderBy: {
                borrowedOn: 'desc',
            },
        });

        return {
            user,
            borrowedBooks: borrowedBooks.map((b) => ({
                id: b.id,
                title: b.bookCopy.book.bookName,
                author: b.bookCopy.book.author,
                coverImage: b.bookCopy.book.image,
                coverColor: b.bookCopy.book.bgColor,
                category: b.bookCopy.book.genre,
                borrowedOn: b.borrowedOn,
                dueDate: b.dueDate,
                returnedOn: b.returnedOn,
                status: b.status,
            })),
        };
    }
}
