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
exports.borrowBookController = void 0;
const borrow_service_1 = require("../../services/borrow.service");
const borrowBookController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { bookId } = req.params;
        if (!bookId) {
            res.status(400).json({ message: 'Book ID is required' });
            return;
        }
        const borrowRequest = yield borrow_service_1.BorrowService.requestBook(user.id, bookId, user.collegeId);
        res.json({
            message: 'Borrow request submitted successfully. Waiting for admin approval.',
            borrowRequest
        });
    }
    catch (error) {
        console.error('borrow book error:', error);
        res.status(error.message.includes('limit') || error.message.includes('already') ? 400 : 500)
            .json({ message: error.message || 'Server error' });
    }
});
exports.borrowBookController = borrowBookController;
