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
exports.deleteBookController = void 0;
const prismaDb_1 = require("../../helpers/prismaDb");
const deleteBookController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = req.admin;
    const { bookId } = req.params;
    if (!admin) {
        res.status(401).json({ message: 'Unauthorized access' });
        return;
    }
    try {
        // Check if book exists and belongs to the admin's college
        const book = yield prismaDb_1.prisma.book.findFirst({
            where: {
                id: bookId,
                collegeId: admin.collegeId
            }
        });
        if (!book) {
            res.status(404).json({ message: 'Book not found' });
            return;
        }
        // Delete the book (Cascade will handle copies and requests if configured in schema, 
        // but based on schema review:
        // BookCopy has onDelete: Cascade.
        // BorrowedRequests has onDelete: Cascade.
        // BorrowedBook does NOT have onDelete: Cascade on bookCopyId relation directly in a way that deletes BorrowedBook when Book is deleted? 
        // Wait, BorrowedBook relates to BookCopy. If BookCopy is deleted (cascade from Book), does BorrowedBook get deleted?
        // Schema: 
        // model BorrowedBook { ... bookCopy BookCopy @relation(..., onDelete: Cascade) ... }
        // Yes, it seems BorrowedBook also cascades on BookCopy delete.
        yield prismaDb_1.prisma.book.delete({
            where: {
                id: bookId
            }
        });
        res.status(200).json({ message: 'Book deleted successfully' });
    }
    catch (error) {
        console.error('Delete book error:', (error === null || error === void 0 ? void 0 : error.message) || error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.deleteBookController = deleteBookController;
