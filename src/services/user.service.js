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
exports.UserService = void 0;
const prismaDb_1 = require("../helpers/prismaDb");
class UserService {
    /**
     * Get all users with advanced filtering and pagination
     */
    static getAllUsers(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { collegeId, pageNumber = 0, searchQuery = '', isEmailVerified, isVerifiedByAdmin, hasActiveBorrows, role, pageSize = 20, } = params;
            const whereClause = {
                collegeId,
            };
            const andConditions = [];
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
            if (role) {
                andConditions.push({ role });
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
            const usersCount = yield prismaDb_1.prisma.user.count({
                where: whereClause,
            });
            const users = yield prismaDb_1.prisma.user.findMany({
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
                    role: true,
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
        });
    }
    /**
     * Update a user's role
     */
    static updateUserRole(userId, role, collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prismaDb_1.prisma.user.findUnique({
                where: { id: userId, collegeId }
            });
            if (!user)
                throw new Error('User not found');
            return yield prismaDb_1.prisma.user.update({
                where: { id: userId },
                data: { role }
            });
        });
    }
    /**
     * Get exhaustive user details including history
     */
    static getUserDetails(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prismaDb_1.prisma.user.findUnique({
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
                    role: true,
                }
            });
            // ... (rest of method)
            if (!user)
                return null;
            const borrowedBooks = yield prismaDb_1.prisma.borrowedBook.findMany({
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
        });
    }
}
exports.UserService = UserService;
