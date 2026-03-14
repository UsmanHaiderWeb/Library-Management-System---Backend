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
exports.getAllBooksController = void 0;
const book_service_1 = require("../../services/book.service");
const getAllBooksController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { pageNumber, searchQuery, genre, isOnline, availableOnly } = req.query;
        const result = yield book_service_1.BookService.getAllBooks({
            collegeId: admin.collegeId,
            pageNumber: parseInt(pageNumber) || 0,
            searchQuery: searchQuery || '',
            genre: genre || undefined,
            isOnline: isOnline === 'true' ? true : isOnline === 'false' ? false : undefined,
            availableOnly: availableOnly === 'true'
        });
        res.status(200).json(result);
    }
    catch (error) {
        console.error('get all books error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getAllBooksController = getAllBooksController;
