import { Request, Response } from "express";
import { BookService } from "../../services/book.service";

export const getBookDetailsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { bookId } = req.params;
        const { collegeCode } = req.query;

        if (!bookId) {
            res.status(400).json({ success: false, message: "Book ID is required" });
            return;
        }

        const book = await BookService.getBookDetails(bookId, collegeCode as string);

        if (!book) {
            res.status(404).json({ success: false, message: "Book not found" });
            return;
        }

        res.status(200).json({ book });
    } catch (error) {
        console.error("Error in getBookDetailsController:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
