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
exports.PurchaseService = void 0;
const prismaDb_1 = require("../helpers/prismaDb");
const notification_service_1 = require("./notification.service");
class PurchaseService {
    /**
     * Create a new purchase request
     */
    static createRequest(userId, collegeId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prismaDb_1.prisma.purchaseRequest.create({
                data: {
                    bookTitle: data.bookTitle,
                    author: data.author,
                    reason: data.reason,
                    userId,
                    collegeId,
                    status: 'PENDING'
                }
            });
        });
    }
    /**
     * Get all purchase requests for a college
     */
    static getRequests(collegeId, status) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prismaDb_1.prisma.purchaseRequest.findMany({
                where: {
                    collegeId,
                    status: status || undefined
                },
                include: {
                    requestedBy: {
                        select: {
                            name: true,
                            email: true,
                            role: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });
        });
    }
    /**
     * Update the status of a purchase request
     */
    static updateRequestStatus(requestId, status, collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const request = yield prismaDb_1.prisma.purchaseRequest.findUnique({
                where: { id: requestId }
            });
            if (!request || request.collegeId !== collegeId) {
                throw new Error('Request not found or access denied');
            }
            const updatedRequest = yield prismaDb_1.prisma.purchaseRequest.update({
                where: { id: requestId },
                data: { status }
            });
            yield notification_service_1.NotificationService.createNotification(request.userId, `Purchase Request ${status.charAt(0) + status.slice(1).toLowerCase()}`, `Your purchase request for "${request.bookTitle}" has been ${status.toLowerCase()}.`);
            return updatedRequest;
        });
    }
}
exports.PurchaseService = PurchaseService;
