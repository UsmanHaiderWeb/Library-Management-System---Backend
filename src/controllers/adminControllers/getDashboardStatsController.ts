import { Request, Response } from "express";
import { RequestWithAdmin } from "../../helpers/interfaces";
import { AdminService } from "../../services/admin.service";

export const getDashboardStatsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        if (!admin || !admin.collegeId) {
            res.status(401).json({ message: "Unauthorized access" });
            return;
        }

        const stats = await AdminService.getDashboardStats(admin.collegeId);

        res.status(200).json({ stats });
    } catch (error) {
        console.error("get dashboard stats error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getBorrowingTrendsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;

        if (!admin || !admin.collegeId) {
            res.status(401).json({ message: "Unauthorized access" });
            return;
        }

        const days = parseInt(req.query.days as string) || 30;
        const trends = await AdminService.getBorrowingTrends(admin.collegeId, days);

        res.status(200).json({ trends });
    } catch (error) {
        console.error("get borrowing trends error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
