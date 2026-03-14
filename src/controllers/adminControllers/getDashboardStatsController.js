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
exports.getDashboardStatsController = void 0;
const admin_service_1 = require("../../services/admin.service");
const getDashboardStatsController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admin = req.admin;
        if (!admin || !admin.collegeId) {
            res.status(401).json({ message: "Unauthorized access" });
            return;
        }
        const stats = yield admin_service_1.AdminService.getDashboardStats(admin.collegeId);
        res.status(200).json({ stats });
    }
    catch (error) {
        console.error("get dashboard stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDashboardStatsController = getDashboardStatsController;
