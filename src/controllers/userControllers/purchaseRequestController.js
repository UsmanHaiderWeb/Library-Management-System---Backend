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
exports.updatePurchaseRequestStatusController = exports.getAllPurchaseRequestsController = exports.createPurchaseRequestController = void 0;
const purchase_service_1 = require("../../services/purchase.service");
const client_1 = require("@prisma/client");
/**
 * Submit a purchase request (User)
 */
const createPurchaseRequestController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { bookTitle, author, reason } = req.body;
        if (!bookTitle) {
            return res.status(400).json({ message: 'Book title is required' });
        }
        const request = yield purchase_service_1.PurchaseService.createRequest(user.id, user.collegeId, { bookTitle, author, reason });
        res.status(201).json({ message: 'Purchase request submitted successfully', request });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.createPurchaseRequestController = createPurchaseRequestController;
/**
 * Get all purchase requests (Admin)
 */
const getAllPurchaseRequestsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { status } = req.query;
        const requests = yield purchase_service_1.PurchaseService.getRequests(admin.collegeId, status);
        res.json(requests);
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getAllPurchaseRequestsController = getAllPurchaseRequestsController;
/**
 * Update purchase request status (Admin)
 */
const updatePurchaseRequestStatusController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        const { requestId } = req.params;
        const { status } = req.body;
        if (!Object.values(client_1.PurchaseRequestStatus).includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const request = yield purchase_service_1.PurchaseService.updateRequestStatus(requestId, status, admin.collegeId);
        res.json({ message: `Request ${status.toLowerCase()} successfully`, request });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.updatePurchaseRequestStatusController = updatePurchaseRequestStatusController;
