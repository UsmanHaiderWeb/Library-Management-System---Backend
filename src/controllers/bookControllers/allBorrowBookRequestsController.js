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
exports.allBorrowBookRequestsController = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const express_1 = require("express");
const prismaDb_1 = require("../../helpers/prismaDb");
const allBorrowBookRequestsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { pageNumber, searchQuery } = req.query;
        // find whereClause to pass to prisma
        const whereClause = {
            collegeId: admin.collegeId,
        };
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
                    book: {
                        is: {
                            OR: [
                                { bookNumber: { contains: searchQuery } },
                                { bookName: { contains: searchQuery } },
                            ],
                        },
                    },
                },
            ];
        }
        const totalRequestCount = yield prismaDb_1.prisma.borrowedRequests.count({
            where: whereClause
        });
        if (!totalRequestCount) {
            res.status(201).json({ requests: [], totalPages: 0 });
            return;
        }
        const requests = yield prismaDb_1.prisma.borrowedRequests.findMany({
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
                book: {
                    select: {
                        id: true,
                        bookNumber: true,
                        bookName: true,
                        author: true,
                        genre: true,
                    }
                },
                requestedOn: true,
                status: true,
            },
            skip: (pageNumber || 0) * 20,
            take: 20,
        });
        res.json({ requests, totalPages: Math.ceil(totalRequestCount / 20) });
    }
    catch (error) {
        console.log("Controller all borrow book requests error:", error);
        express_1.response.status(500).json({ message: "Internal Server Error." });
    }
    return;
});
exports.allBorrowBookRequestsController = allBorrowBookRequestsController;
