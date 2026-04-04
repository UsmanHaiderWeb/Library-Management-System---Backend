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
exports.updateProfileController = void 0;
const prismaDb_1 = require("../../helpers/prismaDb");
const updateProfileController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { name, phoneNumber } = req.body;
        if (!user || !user.id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!name && !phoneNumber) {
            res.status(400).json({ message: 'No fields to update' });
            return;
        }
        const dataToUpdate = {};
        if (name)
            dataToUpdate.name = name;
        if (phoneNumber)
            dataToUpdate.phoneNumber = phoneNumber;
        const updatedUser = yield prismaDb_1.prisma.user.update({
            where: { id: user.id },
            data: dataToUpdate,
            select: {
                id: true,
                name: true,
                phoneNumber: true,
                email: true,
            }
        });
        res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.updateProfileController = updateProfileController;
