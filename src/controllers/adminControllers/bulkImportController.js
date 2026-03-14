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
exports.bulkImportUsersController = exports.bulkImportBooksController = void 0;
const import_service_1 = require("../../services/import.service");
/**
 * Bulk import books via CSV (Admin only)
 */
const bulkImportBooksController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Please upload a CSV file' });
        }
        const result = yield import_service_1.ImportService.importBooks(file.path, admin.collegeId);
        res.status(201).json({
            message: 'Books imported successfully',
            count: result.length,
            books: result
        });
    }
    catch (error) {
        console.error('bulk import books error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.bulkImportBooksController = bulkImportBooksController;
/**
 * Bulk import users via CSV (Admin only)
 */
const bulkImportUsersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'Please upload a CSV file' });
        }
        const result = yield import_service_1.ImportService.importUsers(file.path, admin.collegeId);
        res.status(201).json({
            message: 'Users imported successfully',
            count: result.length,
            users: result
        });
    }
    catch (error) {
        console.error('bulk import users error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.bulkImportUsersController = bulkImportUsersController;
