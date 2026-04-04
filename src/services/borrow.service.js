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
exports.BorrowService = void 0;
const prismaDb_1 = require("../helpers/prismaDb");
const redisClient_1 = require("../helpers/redisClient");
const notification_service_1 = require("./notification.service");
class BorrowService {
    /**
     * Get limits based on user role
     */
    static getBorrowLimits(role) {
        switch (role) {
            case 'FACULTY':
                return { maxBooks: 10, durationDays: 30 };
            case 'STAFF':
                return { maxBooks: 5, durationDays: 21 };
            case 'STUDENT':
            default:
                return { maxBooks: 3, durationDays: 14 };
        }
    }
    /**
     * Submit a borrow request for a book
     */
    static requestBook(userId, bookId, collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prismaDb_1.prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, role: true, collegeId: true }
            });
            if (!user || user.collegeId !== collegeId) {
                throw new Error('User not found or access denied');
            }
            const { maxBooks } = this.getBorrowLimits(user.role);
            // Check current active borrows (count from Redis or DB)
            const redisKey = `user:${userId}:borrowedBooks`;
            let activeCountStr = yield redisClient_1.redisClient.get(redisKey);
            let activeCount;
            if (activeCountStr === null) {
                activeCount = yield prismaDb_1.prisma.borrowedBook.count({
                    where: { userId, status: 'borrowed' }
                });
                yield redisClient_1.redisClient.set(redisKey, activeCount, 'EX', 3600);
            }
            else {
                activeCount = parseInt(activeCountStr);
            }
            if (activeCount >= maxBooks) {
                throw new Error(`You have reached your borrowing limit of ${maxBooks} books.`);
            }
            // Check if user already has a pending request for this book
            const existingRequest = yield prismaDb_1.prisma.borrowedRequests.findFirst({
                where: {
                    userId,
                    bookId,
                    status: 'pending'
                }
            });
            if (existingRequest) {
                throw new Error('You already have a pending request for this book');
            }
            // Check book availability in the specific college
            const book = yield prismaDb_1.prisma.book.findFirst({
                where: {
                    id: bookId,
                    collegeId,
                    copies: {
                        some: { isBorrowed: false }
                    }
                }
            });
            if (!book) {
                throw new Error('Book not found or no copies available in your college');
            }
            // Create the request
            return yield prismaDb_1.prisma.borrowedRequests.create({
                data: {
                    userId,
                    bookId,
                    collegeId,
                    status: 'pending'
                }
            });
        });
    }
    /**
     * Reject a borrow request
     */
    static rejectRequest(requestId, collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield prismaDb_1.prisma.borrowedRequests.update({
                where: { id: requestId, collegeId },
                data: { status: 'rejected' },
                include: { book: { select: { bookName: true } } }
            });
            yield notification_service_1.NotificationService.createNotification(request.userId, 'Borrow Request Rejected', `Your request for "${request.book.bookName}" has been rejected by the librarian.`);
            return request;
        });
    }
    /**
     * Accept a borrow request and create a borrowed book record
     */
    static acceptRequest(requestId, collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const borrowRequest = yield prismaDb_1.prisma.borrowedRequests.findUnique({
                where: { id: requestId, collegeId, status: 'pending' },
                include: { user: { select: { id: true, role: true } } }
            });
            if (!borrowRequest) {
                throw new Error('Borrow request not found or already processed');
            }
            const { maxBooks, durationDays } = this.getBorrowLimits(borrowRequest.user.role);
            // Re-check limits before accepting
            const redisKey = `user:${borrowRequest.userId}:borrowedBooks`;
            const activeCount = yield prismaDb_1.prisma.borrowedBook.count({
                where: { userId: borrowRequest.userId, status: 'borrowed' }
            });
            if (activeCount >= maxBooks) {
                throw new Error(`User has reached their borrowing limit of ${maxBooks} books.`);
            }
            // Find an available copy
            const availableBookCopy = yield prismaDb_1.prisma.bookCopy.findFirst({
                where: { isBorrowed: false, bookId: borrowRequest.bookId },
                select: { id: true }
            });
            if (!availableBookCopy) {
                throw new Error('No copies available for this book');
            }
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + durationDays);
            return yield prismaDb_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                yield tx.borrowedRequests.update({
                    where: { id: requestId },
                    data: { status: 'accepted' }
                });
                yield tx.bookCopy.update({
                    where: { id: availableBookCopy.id },
                    data: { isBorrowed: true }
                });
                const borrowedBook = yield tx.borrowedBook.create({
                    data: {
                        status: 'borrowed',
                        bookCopyId: availableBookCopy.id,
                        userId: borrowRequest.userId,
                        collegeId,
                        dueDate,
                    }
                });
                // Update Redis cache
                yield redisClient_1.redisClient.set(redisKey, activeCount + 1, 'EX', 3600);
                // Create notification
                const book = yield tx.book.findUnique({ where: { id: borrowRequest.bookId }, select: { bookName: true } });
                yield notification_service_1.NotificationService.createNotification(borrowRequest.userId, 'Borrow Request Accepted', `Your request for "${book === null || book === void 0 ? void 0 : book.bookName}" has been accepted. Please collect it from the library. Due date: ${dueDate.toLocaleDateString()}.`);
                return borrowedBook;
            }));
        });
    }
}
exports.BorrowService = BorrowService;
