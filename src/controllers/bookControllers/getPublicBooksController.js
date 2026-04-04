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
exports.getPublicBooksController = void 0;
const book_service_1 = require("../../services/book.service");
const prismaDb_1 = require("../../helpers/prismaDb");
const getPublicBooksController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pageNumber, searchQuery, genre, isOnline, availableOnly, collegeCode } = req.query;
        let collegeId = undefined;
        if (collegeCode) {
            const college = yield prismaDb_1.prisma.college.findUnique({
                where: { code: collegeCode }
            });
            if (college) {
                collegeId = college.id;
            }
        }
        const result = yield book_service_1.BookService.getAllBooks({
            collegeId,
            pageNumber: parseInt(pageNumber) || 0,
            searchQuery: searchQuery || '',
            genre: genre || undefined,
            isOnline: isOnline === 'true' ? true : isOnline === 'false' ? false : undefined,
            availableOnly: availableOnly === 'true',
            pageSize: 15
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('get public books error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getPublicBooksController = getPublicBooksController;
