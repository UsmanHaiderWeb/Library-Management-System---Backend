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
exports.getDigitalFileController = void 0;
const digital_service_1 = require("../../services/digital.service");
/**
 * Access a digital book file (Securely)
 */
const getDigitalFileController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { bookId } = req.params;
        if (!bookId) {
            return res.status(400).json({ message: 'Book ID is required' });
        }
        const fileUrl = yield digital_service_1.DigitalLibraryService.canAccess(user.id, bookId, user.collegeId);
        res.json({
            message: 'Access granted',
            fileUrl
        });
    }
    catch (error) {
        console.error('digital access error:', error);
        res.status(error.message.includes('verified') ? 403 :
            error.message.includes('not available') ? 404 : 400)
            .json({ message: error.message || 'Server error' });
    }
});
exports.getDigitalFileController = getDigitalFileController;
