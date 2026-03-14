"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentRouter = void 0;
const express_1 = __importDefault(require("express"));
const signupController_1 = require("../controllers/studentAuthControllers/signupController");
const ValidateFormFields_1 = require("../middlewares/ValidateFormFields");
const loginController_1 = require("../controllers/studentAuthControllers/loginController");
const verifyEmailController_1 = require("../controllers/studentAuthControllers/verifyEmailController");
const getUserDetailsController_1 = require("../controllers/studentControllers/getUserDetailsController");
const studentAuthMiddleware_1 = require("../middlewares/studentAuthMiddleware");
const passwordResetController_1 = require("../controllers/authControllers/passwordResetController");
const purchaseRequestController_1 = require("../controllers/userControllers/purchaseRequestController");
exports.studentRouter = express_1.default.Router();
// Auth routes
exports.studentRouter.post('/signup', ValidateFormFields_1.validateSignupFieldsMiddleware, signupController_1.signupController);
exports.studentRouter.post('/login', ValidateFormFields_1.validateLoginFieldsMiddleware, loginController_1.loginController);
exports.studentRouter.post('/verify-email', ValidateFormFields_1.validateVerificationCodeMiddleware, verifyEmailController_1.verifyEmailController);
// Password Reset
exports.studentRouter.post('/forgot-password', passwordResetController_1.requestPasswordResetController);
exports.studentRouter.post('/reset-password', passwordResetController_1.resetPasswordController);
// Purchase Requests
exports.studentRouter.post('/purchase-request', studentAuthMiddleware_1.studentAuthMiddleware, purchaseRequestController_1.createPurchaseRequestController);
// detail routes
exports.studentRouter.get('/getUserDetails', studentAuthMiddleware_1.studentAuthMiddleware, getUserDetailsController_1.getUserDetailsController);
