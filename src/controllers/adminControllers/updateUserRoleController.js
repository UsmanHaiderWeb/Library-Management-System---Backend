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
exports.updateUserRoleController = void 0;
const user_service_1 = require("../../services/user.service");
const client_1 = require("@prisma/client");
/**
 * Update a student's role (Admin only)
 */
const updateUserRoleController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { userId } = req.params;
        const { role } = req.body;
        if (!Object.values(client_1.UserRole).includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        const updatedUser = yield user_service_1.UserService.updateUserRole(userId, role, admin.collegeId);
        res.json({
            message: `User role updated to ${role} successfully`,
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                role: updatedUser.role
            }
        });
    }
    catch (error) {
        console.error('update user role error:', error);
        res.status(error.message === 'User not found' ? 404 : 500)
            .json({ message: error.message || 'Server error' });
    }
});
exports.updateUserRoleController = updateUserRoleController;
