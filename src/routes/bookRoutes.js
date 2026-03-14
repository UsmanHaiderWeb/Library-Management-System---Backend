"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookRouter = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const express_1 = __importDefault(require("express"));
const adminAuthMiddleware_1 = require("../middlewares/adminAuthMiddleware");
const ValidateFormFields_1 = require("../middlewares/ValidateFormFields");
const createBookController_1 = require("../controllers/bookControllers/createBookController");
const deleteBookController_1 = require("../controllers/bookControllers/deleteBookController");
const updateBookController_1 = require("../controllers/bookControllers/updateBookController");
const studentAuthMiddleware_1 = require("../middlewares/studentAuthMiddleware");
const getDigitalFileController_1 = require("../controllers/bookControllers/getDigitalFileController");
const getBookDetailsController_1 = require("../controllers/bookControllers/getBookDetailsController");
const borrowBookController_1 = require("../controllers/bookControllers/borrowBookController");
exports.bookRouter = express_1.default.Router();
// public routes
exports.bookRouter.get('/getBookDetails/:bookId', getBookDetailsController_1.getBookDetailsController);
// Digital Access (Secure)
exports.bookRouter.get('/digital/:bookId', studentAuthMiddleware_1.studentAuthMiddleware, getDigitalFileController_1.getDigitalFileController);
// create book
exports.bookRouter.post('/create', adminAuthMiddleware_1.adminAuthMiddleware, ValidateFormFields_1.validateCreateBookBodyDataMiddleware, createBookController_1.createBookController);
// borrow book
exports.bookRouter.post('/borrow/:bookId', studentAuthMiddleware_1.studentAuthMiddleware, borrowBookController_1.borrowBookController);
// delete book
exports.bookRouter.delete('/delete/:bookId', adminAuthMiddleware_1.adminAuthMiddleware, deleteBookController_1.deleteBookController);
// update book
exports.bookRouter.post('/update/:bookId', adminAuthMiddleware_1.adminAuthMiddleware, ValidateFormFields_1.validateCreateBookBodyDataMiddleware, updateBookController_1.updateBookController);
