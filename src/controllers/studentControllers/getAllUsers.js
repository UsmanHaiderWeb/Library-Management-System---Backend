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
exports.getAllUsersController = void 0;
const user_service_1 = require("../../services/user.service");
const getAllUsersController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { page, search, isEmailVerified, isVerifiedByAdmin, hasActiveBorrows, role } = req.query;
        const result = yield user_service_1.UserService.getAllUsers({
            collegeId: admin.collegeId,
            pageNumber: page ? parseInt(page) : 0,
            searchQuery: search,
            isEmailVerified: isEmailVerified === 'true' ? true : isEmailVerified === 'false' ? false : undefined,
            isVerifiedByAdmin: isVerifiedByAdmin === 'true' ? true : isVerifiedByAdmin === 'false' ? false : undefined,
            hasActiveBorrows: hasActiveBorrows === 'true',
            role: role,
        });
        res.json(result);
    }
    catch (error) {
        console.error('get all users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getAllUsersController = getAllUsersController;
