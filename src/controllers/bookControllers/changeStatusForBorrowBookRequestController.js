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
exports.changeStatusForBorrowBookRequestController = void 0;
const borrow_service_1 = require("../../services/borrow.service");
const changeStatusForBorrowBookRequestController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { borrowRequestId } = req.params;
        const { status } = req.body;
        if (!borrowRequestId) {
            res.status(400).json({ message: "Please provide request ID." });
            return;
        }
        if (!status || (status !== 'rejected' && status !== 'accepted')) {
            res.status(400).json({ message: "Please provide valid request status ('accepted' or 'rejected')." });
            return;
        }
        if (status === 'rejected') {
            yield borrow_service_1.BorrowService.rejectRequest(borrowRequestId, admin.collegeId);
            res.status(200).json({ message: "Borrow book request has been rejected successfully.", status });
            return;
        }
        const borrowedBook = yield borrow_service_1.BorrowService.acceptRequest(borrowRequestId, admin.collegeId);
        res.status(201).json({
            message: "Borrow book request accepted successfully. The book has been assigned to the user.",
            status,
            borrowedBook
        });
    }
    catch (error) {
        console.error("accept borrow book request controller error:", error);
        res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message || "Internal Server Error." });
    }
});
exports.changeStatusForBorrowBookRequestController = changeStatusForBorrowBookRequestController;
