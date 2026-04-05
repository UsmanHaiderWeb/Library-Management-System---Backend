/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithUser, RequestWithAdmin } from '../../helpers/interfaces';
import { RenewalService } from '../../services/renewal.service';
import { FineService } from '../../services/fine.service';
import logger from '../../helpers/logger';

// Student: request renewal
export const requestRenewalController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const { borrowedBookId } = req.params;

        if (!borrowedBookId) {
            res.status(400).json({ message: 'Borrowed book ID is required' });
            return;
        }

        const result = await RenewalService.requestRenewal(user.id, borrowedBookId);

        res.status(201).json({
            message: `Renewal requested. If approved, due date will be extended by ${result.extensionDays} days.`,
            renewalRequest: result.request,
        });
    } catch (error: any) {
        res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
    }
};

// Student: get my fine history
export const getMyFinesController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const fines = await FineService.getUserFines(user.id);

        res.status(200).json({ fines });
    } catch (error) {
        logger.error('get fines error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Student: get my renewal requests
export const getMyRenewalRequestsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const requests = await RenewalService.getUserRenewalRequests(user.id);

        res.status(200).json({ renewalRequests: requests });
    } catch (error) {
        logger.error('get renewal requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: get all renewal requests
export const getAllRenewalRequestsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { status } = req.query as { status?: string };

        const requests = await RenewalService.getCollegeRenewalRequests(admin.collegeId, status);

        res.status(200).json({ renewalRequests: requests });
    } catch (error) {
        logger.error('get renewal requests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: approve renewal
export const approveRenewalController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { requestId } = req.params;

        await RenewalService.approveRenewal(requestId, admin.collegeId);

        res.status(200).json({ message: 'Renewal approved successfully' });
    } catch (error: any) {
        res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
    }
};

// Admin: reject renewal
export const rejectRenewalController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const { requestId } = req.params;

        await RenewalService.rejectRenewal(requestId, admin.collegeId);

        res.status(200).json({ message: 'Renewal rejected' });
    } catch (error: any) {
        res.status(error.message.includes('not found') ? 404 : 400).json({ message: error.message });
    }
};

// Admin: get fine history for college
export const getAllFinesController = async (req: Request, res: Response): Promise<void> => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const pageNumber = parseInt(req.query.pageNumber as string) || 0;

        const result = await FineService.getCollegeFines(admin.collegeId, pageNumber);

        res.status(200).json(result);
    } catch (error) {
        logger.error('get all fines error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
