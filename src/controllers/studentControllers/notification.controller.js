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
exports.markAllAsReadController = exports.markAsReadController = exports.getNotificationsController = void 0;
const notification_service_1 = require("../../services/notification.service");
/**
 * Get all notifications for the current student
 */
const getNotificationsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const notifications = yield notification_service_1.NotificationService.getUserNotifications(user.id);
        const unreadCount = yield notification_service_1.NotificationService.getUnreadCount(user.id);
        res.json({
            notifications,
            unreadCount
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.getNotificationsController = getNotificationsController;
/**
 * Mark a single notification as read
 */
const markAsReadController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        const { notificationId } = req.params;
        yield notification_service_1.NotificationService.markAsRead(notificationId, user.id);
        res.json({ message: 'Notification marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.markAsReadController = markAsReadController;
/**
 * Mark all notifications as read for the current student
 */
const markAllAsReadController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        yield notification_service_1.NotificationService.markAllAsRead(user.id);
        res.json({ message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});
exports.markAllAsReadController = markAllAsReadController;
