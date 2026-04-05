/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithUser, RequestWithAdmin } from '../../helpers/interfaces';
import { PurchaseService } from '../../services/purchase.service';
import { PurchaseRequestStatus } from '@prisma/client';

/**
 * Submit a purchase request (User)
 */
export const createPurchaseRequestController = async (req: Request, res: Response) => {
  try {
    const user = (req as RequestWithUser).user;
    const { bookTitle, author, reason } = req.body;

    if (!bookTitle) {
      return res.status(400).json({ message: 'Book title is required' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Verification required. Please verify your email to request books.' });
    }

    const request = await PurchaseService.createRequest(user.id, user.collegeId as string, { bookTitle, author, reason });
    res.status(201).json({ message: 'Purchase request submitted successfully', request });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Get all purchase requests (Admin)
 */
export const getAllPurchaseRequestsController = async (req: Request, res: Response) => {
  try {
    const admin = (req as RequestWithAdmin).admin;
    const { status } = req.query;

    const requests = await PurchaseService.getRequests(admin.collegeId, status as PurchaseRequestStatus);
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/**
 * Update purchase request status (Admin)
 */
export const updatePurchaseRequestStatusController = async (req: Request, res: Response) => {
  try {
    const admin = (req as RequestWithAdmin).admin;
    const { requestId } = req.params;
    const { status } = req.body;

    if (!Object.values(PurchaseRequestStatus).includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await PurchaseService.updateRequestStatus(requestId, status as PurchaseRequestStatus, admin.collegeId);
    res.json({ message: `Request ${status.toLowerCase()} successfully`, request });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
