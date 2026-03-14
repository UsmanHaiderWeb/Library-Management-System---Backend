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
exports.createBookController = void 0;
const prismaDb_1 = require("../../helpers/prismaDb");
const createBookController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const admin = req.admin;
    if (!admin) {
        res.status(401).json({ message: 'Unauthorized access' });
        return;
    }
    const { bookNumber, bookName, summary, author, genre, image, bgColor, totalBooks, isOnline = false, onlineFileUrl, almirahNumber, shelfNumber } = req.body;
    // check whether book with the same book number already exists
    const doesBookAlreadyExist = yield prismaDb_1.prisma.book.findFirst({
        where: {
            bookNumber,
            collegeId: admin === null || admin === void 0 ? void 0 : admin.collegeId,
        },
        select: {
            id: true,
        }
    });
    if (doesBookAlreadyExist) {
        res.status(409).json({ message: "A book with the same number already exists" });
        return;
    }
    try {
        const book = yield prismaDb_1.prisma.book.create({
            data: {
                bookNumber,
                bookName,
                summary,
                author,
                genre,
                image,
                bgColor,
                totalBooks: Number(totalBooks),
                almirahNumber: Number(almirahNumber),
                shelfNumber: Number(shelfNumber),
                isOnline,
                onlineFileUrl,
                collegeId: admin.collegeId,
                copies: {
                    create: Array.from({ length: Number(totalBooks) }, () => ({
                        isBorrowed: false
                    }))
                }
            },
            include: { copies: true }
        });
        res.status(201).json({ message: 'Book created successfully', book });
    }
    catch (error) {
        console.error('Create book error:', (error === null || error === void 0 ? void 0 : error.message) || error);
        res.status(500).json({ message: 'Internal server error' });
    }
    return;
});
exports.createBookController = createBookController;
