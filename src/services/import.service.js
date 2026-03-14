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
exports.ImportService = void 0;
const fs_1 = __importDefault(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const prismaDb_1 = require("../helpers/prismaDb");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class ImportService {
    /**
     * Import books from CSV
     */
    static importBooks(filePath, collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            return new Promise((resolve, reject) => {
                fs_1.default.createReadStream(filePath)
                    .pipe((0, csv_parser_1.default)())
                    .on('data', (data) => results.push(data))
                    .on('end', () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const importedBooks = yield prismaDb_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                            const books = [];
                            for (const row of results) {
                                const totalBooks = parseInt(row.totalBooks) || 1;
                                const createdBook = yield tx.book.create({
                                    data: {
                                        bookNumber: row.bookNumber,
                                        bookName: row.bookName,
                                        summary: row.summary || '',
                                        author: row.author,
                                        genre: row.genre,
                                        image: '',
                                        totalBooks: totalBooks,
                                        almirahNumber: parseInt(row.almirahNumber) || 0,
                                        shelfNumber: parseInt(row.shelfNumber) || 0,
                                        isOnline: row.isOnline === 'true',
                                        onlineFileUrl: row.onlineFileUrl || null,
                                        bgColor: row.bgColor || '#ffffff',
                                        collegeId: collegeId,
                                        copies: {
                                            create: Array.from({ length: totalBooks }).map(() => ({
                                                isBorrowed: false,
                                            }))
                                        }
                                    }
                                });
                                books.push(createdBook);
                            }
                            return books;
                        }));
                        // Clean up file
                        fs_1.default.unlinkSync(filePath);
                        resolve(importedBooks);
                    }
                    catch (error) {
                        reject(error);
                    }
                }))
                    .on('error', (error) => reject(error));
            });
        });
    }
    /**
     * Import users from CSV
     */
    static importUsers(filePath, collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            return new Promise((resolve, reject) => {
                fs_1.default.createReadStream(filePath)
                    .pipe((0, csv_parser_1.default)())
                    .on('data', (data) => results.push(data))
                    .on('end', () => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const importedUsers = yield prismaDb_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                            const users = [];
                            for (const row of results) {
                                // Default password if not provided is studentId
                                const rawPassword = row.password || row.studentId;
                                const hashedPassword = yield bcryptjs_1.default.hash(rawPassword, 10);
                                const createdUser = yield tx.user.create({
                                    data: {
                                        name: row.name,
                                        studentId: row.studentId,
                                        email: row.email,
                                        password: hashedPassword,
                                        phoneNumber: row.phoneNumber || null,
                                        batchYear: parseInt(row.batchYear) || null,
                                        role: row.role || 'STUDENT',
                                        isEmailVerified: true, // Bulk imported users are usually pre-verified
                                        isVerifiedByAdmin: true,
                                        collegeId: collegeId,
                                    }
                                });
                                users.push({ id: createdUser.id, email: createdUser.email });
                            }
                            return users;
                        }));
                        // Clean up file
                        fs_1.default.unlinkSync(filePath);
                        resolve(importedUsers);
                    }
                    catch (error) {
                        reject(error);
                    }
                }))
                    .on('error', (error) => reject(error));
            });
        });
    }
}
exports.ImportService = ImportService;
