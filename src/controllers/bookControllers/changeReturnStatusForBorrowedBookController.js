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
exports.changeReturnStatusForBorrowedBookController = void 0;
const prismaDb_1 = require("../../helpers/prismaDb");
const redisClient_1 = require("../../helpers/redisClient");
const fine_service_1 = require("../../services/fine.service");
const changeReturnStatusForBorrowedBookController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { borrowedBookId } = req.params;
        const { status } = req.body;
        if (!borrowedBookId || status !== 'returned') {
            res.status(400).json({ message: "Invalid request. Provide valid book ID and 'returned' status." });
            return;
        }
        const borrowedBook = yield prismaDb_1.prisma.borrowedBook.findUnique({
            where: {
                id: borrowedBookId,
                collegeId: admin.collegeId,
                status: 'borrowed',
            },
            select: {
                id: true,
                userId: true,
                bookCopyId: true,
                dueDate: true,
            }
        });
        if (!borrowedBook) {
            res.status(400).json({ message: "Borrowed Book not found or already returned." });
            return;
        }
        const returnedOn = new Date();
        const fineAmount = fine_service_1.FineService.calculateFine(borrowedBook.dueDate, returnedOn);
        yield prismaDb_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.borrowedBook.update({
                where: { id: borrowedBook.id },
                data: {
                    status: "returned",
                    returnedOn,
                }
            });
            yield tx.bookCopy.update({
                where: { id: borrowedBook.bookCopyId },
                data: { isBorrowed: false }
            });
            if (fineAmount > 0) {
                yield fine_service_1.FineService.applyFine(borrowedBook.userId, fineAmount, tx);
            }
            const redisKey = `user:${borrowedBook.userId}:borrowedBooks`;
            yield redisClient_1.redisClient.del(redisKey);
        }));
        res.status(200).json({
            message: "Borrowed book has been returned.",
            fineApplied: fineAmount,
            returnedOn,
        });
    }
    catch (error) {
        console.error("return borrowed book controller error:", error);
        res.status(500).json({ message: "Internal Server Error." });
    }
});
exports.changeReturnStatusForBorrowedBookController = changeReturnStatusForBorrowedBookController;
