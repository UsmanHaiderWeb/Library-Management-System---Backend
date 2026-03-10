import { prisma } from '../helpers/prismaDb';
import { PurchaseRequestStatus } from '@prisma/client';

export class PurchaseService {
  /**
   * Create a new purchase request
   */
  static async createRequest(userId: string, collegeId: string, data: { bookTitle: string; author?: string; reason?: string }) {
    return await prisma.purchaseRequest.create({
      data: {
        bookTitle: data.bookTitle,
        author: data.author,
        reason: data.reason,
        userId,
        collegeId,
        status: 'PENDING'
      }
    });
  }

  /**
   * Get all purchase requests for a college
   */
  static async getRequests(collegeId: string, status?: PurchaseRequestStatus) {
    return await prisma.purchaseRequest.findMany({
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
  }

  /**
   * Update the status of a purchase request
   */
  static async updateRequestStatus(requestId: string, status: PurchaseRequestStatus, collegeId: string) {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || request.collegeId !== collegeId) {
      throw new Error('Request not found or access denied');
    }

    return await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status }
    });
  }
}
