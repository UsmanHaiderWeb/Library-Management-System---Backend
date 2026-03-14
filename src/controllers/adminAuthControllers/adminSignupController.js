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
exports.adminSignupController = void 0;
const express_validator_1 = require("express-validator");
const admin_service_1 = require("../../services/admin.service");
// Signup controller
const adminSignupController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { email, password, name, collegeCode } = req.body;
        const { token } = yield admin_service_1.AdminService.signup({ email, password, name, collegeCode });
        res.status(201).json({
            message: 'Admin created successfully',
            token,
        });
    }
    catch (error) {
        if (error.message === 'Invalid college code.' || error.message === 'Admin already exists') {
            res.status(400).json({ message: error.message });
            return;
        }
        console.error('Admin Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.adminSignupController = adminSignupController;
