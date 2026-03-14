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
exports.DigitalLibraryService = void 0;
const prismaDb_1 = require("../helpers/prismaDb");
class DigitalLibraryService {
    /**
     * Check if a user can access a digital book
     */
    static canAccess(userId, bookId, collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield prismaDb_1.prisma.user.findUnique({
                where: { id: userId },
                select: { isVerifiedByAdmin: true, isEmailVerified: true, collegeId: true }
            });
            if (!user || user.collegeId !== collegeId) {
                throw new Error('User not found or access denied');
            }
            if (!user.isVerifiedByAdmin || !user.isEmailVerified) {
                throw new Error('Your account must be verified by an admin to access the digital library.');
            }
            const book = yield prismaDb_1.prisma.book.findFirst({
                where: { id: bookId, collegeId, isOnline: true },
                select: { onlineFileUrl: true }
            });
            if (!book) {
                throw new Error('This book is not available in the digital library or does not exist.');
            }
            return book.onlineFileUrl;
        });
    }
}
exports.DigitalLibraryService = DigitalLibraryService;
