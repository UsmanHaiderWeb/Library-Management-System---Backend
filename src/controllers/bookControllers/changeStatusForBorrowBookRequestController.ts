/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { BorrowService } from "../../services/borrow.service";
import logger from '../../helpers/logger';

export const changeStatusForBorrowBookRequestController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
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
            await BorrowService.rejectRequest(borrowRequestId, admin.collegeId);
            res.status(200).json({ message: "Borrow book request has been rejected successfully.", status });
            return;
        }

        const borrowedBook = await BorrowService.acceptRequest(borrowRequestId, admin.collegeId);

        res.status(201).json({
            message: "Borrow book request accepted successfully. The book has been assigned to the user.",
            status,
            borrowedBook
        });
    } catch (error: any) {
        logger.error("accept borrow book request controller error:", error);
        res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message || "Internal Server Error." });
    }
};