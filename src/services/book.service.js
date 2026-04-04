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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookService = void 0;
const prismaDb_1 = require("../helpers/prismaDb");
const dateUtils_1 = require("../helpers/dateUtils");
const fs_1 = __importDefault(require("fs"));
class BookService {
    /**
     * Get all books with advanced filtering and pagination
     */
    static getAllBooks(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const { collegeId, pageNumber = 0, searchQuery = '', genre, isOnline, availableOnly, pageSize = 20, fromDate, toDate } = params;
            const whereClause = {};
            if (collegeId) {
                whereClause.collegeId = collegeId;
            }
            if (searchQuery.trim() !== '') {
                whereClause.OR = [
                    { bookNumber: { contains: searchQuery } },
                    { bookName: { contains: searchQuery } },
                    { genre: { contains: searchQuery } },
                    { author: { contains: searchQuery } },
                ];
            }
            if (genre) {
                whereClause.genre = { contains: genre };
            }
            if (isOnline !== undefined) {
                whereClause.isOnline = isOnline;
            }
            if (availableOnly) {
                whereClause.copies = {
                    some: {
                        isBorrowed: false,
                    },
                };
            }
            const dateCondition = (0, dateUtils_1.getDateRangeQuery)(fromDate, toDate);
            if (dateCondition) {
                whereClause.createdAt = dateCondition;
            }
            console.log("FINAL_WHERE_CLAUE:", JSON.stringify(whereClause, null, 2));
            // Write to a local file we can definitely read
            try {
                fs_1.default.writeFileSync(__dirname + '/last_query.json', JSON.stringify({ params, whereClause }, null, 2));
            }
            catch (e) { }
            const booksCount = yield prismaDb_1.prisma.book.count({
                where: whereClause,
            });
            const books = yield prismaDb_1.prisma.book.findMany({
                where: whereClause,
                skip: pageNumber * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    bookNumber: true,
                    bookName: true,
                    author: true,
                    createdAt: true,
                    genre: true,
                    almirahNumber: true,
                    shelfNumber: true,
                    image: true,
                    totalBooks: true,
                    isOnline: true,
                    _count: {
                        select: {
                            BorrowedRequests: true,
                            copies: {
                                where: {
                                    isBorrowed: false,
                                },
                            },
                        },
                    },
                },
            });
            return {
                books,
                totalPages: Math.ceil(booksCount / pageSize),
                totalCount: booksCount,
            };
        });
    }
    /**
     * Get specific book details
     */
    static getBookDetails(bookId, collegeCode) {
        return __awaiter(this, void 0, void 0, function* () {
            return prismaDb_1.prisma.book.findUnique({
                where: {
                    id: bookId,
                    College: {
                        code: collegeCode,
                    },
                },
                select: {
                    id: true,
                    bookNumber: true,
                    bookName: true,
                    summary: true,
                    author: true,
                    genre: true,
                    bgColor: true,
                    image: true,
                    almirahNumber: true,
                    shelfNumber: true,
                    isOnline: true,
                    onlineFileUrl: true,
                    totalBooks: true,
                    _count: {
                        select: {
                            copies: {
                                where: {
                                    isBorrowed: false,
                                },
                            },
                        },
                    },
                },
            });
        });
    }
}
exports.BookService = BookService;
