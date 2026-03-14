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
exports.getBookDetailsController = void 0;
const book_service_1 = require("../../services/book.service");
const getBookDetailsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { bookId } = req.params;
        const { collegeCode } = req.query;
        if (!bookId) {
            res.status(400).json({ success: false, message: "Book ID is required" });
            return;
        }
        const book = yield book_service_1.BookService.getBookDetails(bookId, collegeCode);
        if (!book) {
            res.status(404).json({ success: false, message: "Book not found" });
            return;
        }
        res.status(200).json({ book });
    }
    catch (error) {
        console.error("Error in getBookDetailsController:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.getBookDetailsController = getBookDetailsController;
