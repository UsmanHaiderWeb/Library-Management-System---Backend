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
exports.borrowedBooksHistoryController = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const express_1 = require("express");
const prismaDb_1 = require("../../helpers/prismaDb");
const dateUtils_1 = require("../../helpers/dateUtils");
const borrowedBooksHistoryController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { pageNumber, searchQuery, fromDate, toDate } = req.query;
        // find whereClause to pass to prisma
        const whereClause = {
            collegeId: admin.collegeId,
            status: "returned"
        };
        const dateCondition = (0, dateUtils_1.getDateRangeQuery)(fromDate, toDate);
        if (dateCondition) {
            whereClause.returnedOn = dateCondition;
        }
        if ((searchQuery === null || searchQuery === void 0 ? void 0 : searchQuery.trim()) !== '') {
            whereClause.OR = [
                {
                    user: {
                        OR: [
                            { name: { contains: searchQuery } },
                            { studentId: { contains: searchQuery } },
                        ],
                    },
                },
                {
                    bookCopy: {
                        book: {
                            OR: [
                                { bookName: { contains: searchQuery } },
                                { bookNumber: { contains: searchQuery } },
                            ],
                        },
                    },
                },
            ];
        }
        const totalBorrowedBooksCount = yield prismaDb_1.prisma.borrowedBook.count({
            where: whereClause
        });
        if (!totalBorrowedBooksCount) {
            res.status(201).json({ requests: [], totalPages: 0 });
            return;
        }
        const borrowedBooks = yield prismaDb_1.prisma.borrowedBook.findMany({
            where: whereClause,
            select: {
                id: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        studentId: true,
                    }
                },
                bookCopy: {
                    select: {
                        book: {
                            select: {
                                id: true,
                                bookNumber: true,
                                bookName: true,
                            }
                        },
                    }
                },
                borrowedOn: true,
                status: true,
                dueDate: true,
                returnedOn: true,
            },
            skip: (pageNumber || 0) * 20,
            take: 20,
        });
        res.json({ borrowedBooks, totalPages: Math.ceil(totalBorrowedBooksCount / 20) });
    }
    catch (error) {
        console.log("Controller all borrowed books error:", error);
        express_1.response.status(500).json({ message: "Internal Server Error." });
    }
    return;
});
exports.borrowedBooksHistoryController = borrowedBooksHistoryController;
