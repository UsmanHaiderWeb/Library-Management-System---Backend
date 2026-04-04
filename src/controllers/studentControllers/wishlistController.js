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
exports.getWishlistController = exports.toggleSavedBookController = void 0;
const prismaDb_1 = require("../../helpers/prismaDb");
/**
 * Toggle Save Book (Add to or Remove from Wishlist)
 */
const toggleSavedBookController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { bookId } = req.body;
        if (!user || !user.id || !bookId) {
            res.status(400).json({ message: 'User ID and Book ID are required' });
            return;
        }
        if (!user.isEmailVerified) {
            res.status(403).json({ message: 'Verification required. Please verify your email to manage wishlist.' });
            return;
        }
        const existingSave = yield prismaDb_1.prisma.savedBook.findUnique({
            where: {
                userId_bookId: {
                    userId: user.id,
                    bookId: bookId,
                }
            }
        });
        if (existingSave) {
            yield prismaDb_1.prisma.savedBook.delete({
                where: { id: existingSave.id },
            });
            res.status(200).json({ message: 'Book removed from wishlist', isSaved: false });
        }
        else {
            yield prismaDb_1.prisma.savedBook.create({
                data: {
                    userId: user.id,
                    bookId: bookId,
                }
            });
            res.status(201).json({ message: 'Book added to wishlist', isSaved: true });
        }
    }
    catch (error) {
        console.error('Toggle saved book error:', error);
        res.status(500).json({ message: 'Server error while toggling wishlist' });
    }
});
exports.toggleSavedBookController = toggleSavedBookController;
/**
 * Get User's Wishlist
 */
const getWishlistController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user || !user.id) {
            res.status(400).json({ message: 'User not found in request' });
            return;
        }
        const savedBooks = yield prismaDb_1.prisma.savedBook.findMany({
            where: { userId: user.id },
            include: {
                book: {
                    select: {
                        id: true,
                        bookName: true,
                        author: true,
                        image: true,
                        bgColor: true,
                        genre: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ savedBooks });
    }
    catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ message: 'Server error while fetching wishlist' });
    }
});
exports.getWishlistController = getWishlistController;
