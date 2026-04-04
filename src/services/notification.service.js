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
exports.NotificationService = void 0;
const prismaDb_1 = require("../helpers/prismaDb");
class NotificationService {
    /**
     * Create a new notification for a user
     */
    static createNotification(userId, title, message) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield prismaDb_1.prisma.notification.create({
                    data: {
                        userId,
                        title,
                        message,
                        isRead: false
                    }
                });
            }
            catch (error) {
                console.error('Error creating notification:', error);
                // We don't throw here to avoid breaking the main transaction
                return null;
            }
        });
    }
    /**
     * Get user notifications
     */
    static getUserNotifications(userId_1) {
        return __awaiter(this, arguments, void 0, function* (userId, limit = 20) {
            return yield prismaDb_1.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit
            });
        });
    }
    /**
     * Get unread count
     */
    static getUnreadCount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prismaDb_1.prisma.notification.count({
                where: { userId, isRead: false }
            });
        });
    }
    /**
     * Mark notification as read
     */
    static markAsRead(notificationId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prismaDb_1.prisma.notification.updateMany({
                where: { id: notificationId, userId },
                data: { isRead: true }
            });
        });
    }
    /**
     * Mark all as read
     */
    static markAllAsRead(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prismaDb_1.prisma.notification.updateMany({
                where: { userId, isRead: false },
                data: { isRead: true }
            });
        });
    }
}
exports.NotificationService = NotificationService;
