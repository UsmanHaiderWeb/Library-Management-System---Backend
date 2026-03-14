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
exports.getUserDetailsController = void 0;
const user_service_1 = require("../../services/user.service");
const getUserDetailsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user || !user.id) {
            res.status(400).json({ message: 'User not found in request' });
            return;
        }
        const data = yield user_service_1.UserService.getUserDetails(user.id);
        if (!data) {
            res.status(404).json({ message: 'User details not found' });
            return;
        }
        res.status(200).json(data);
    }
    catch (error) {
        console.error('get user details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.getUserDetailsController = getUserDetailsController;
