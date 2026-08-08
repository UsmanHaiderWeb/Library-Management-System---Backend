import { prisma } from '../helpers/prismaDb';
import { PurchaseRequestStatus } from '@prisma/client';
import { NotificationService } from './notification.service';

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
   * Get all purchase requests for a college (paginated, searchable,
   * flattened for the Admin portal table)
   */
  static async getRequests(
    collegeId: string,
    options: { status?: PurchaseRequestStatus; pageNumber?: number; search?: string; pageSize?: number } = {}
  ) {
    const { status, pageNumber = 0, search, pageSize = 10 } = options;

    const whereClause = {
      collegeId,
      status: status || undefined,
      ...(search
        ? {
            OR: [
              { bookTitle: { contains: search } },
              { author: { contains: search } },
            ],
          }
        : {}),
    };

    const [requests, total] = await Promise.all([
      prisma.purchaseRequest.findMany({
        where: whereClause,
        include: {
          requestedBy: {
            select: {
              name: true,
              studentId: true,
              email: true,
              role: true
            }
          }
        },
        skip: pageNumber * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.purchaseRequest.count({ where: whereClause }),
    ]);

    return {
      requests: requests.map((request) => ({
        id: request.id,
        bookName: request.bookTitle,
        author: request.author,
        reason: request.reason,
        status: request.status,
        requestedOn: request.createdAt,
        user: {
          name: request.requestedBy.name,
          studentId: request.requestedBy.studentId,
          email: request.requestedBy.email,
          role: request.requestedBy.role,
        },
      })),
      totalPages: Math.ceil(total / pageSize),
      totalCount: total,
    };
  }

  /**
   * Delete a purchase request (admin, college-scoped)
   */
  static async deleteRequest(requestId: string, collegeId: string) {
    const request = await prisma.purchaseRequest.findUnique({
      where: { id: requestId }
    });

    if (!request || request.collegeId !== collegeId) {
      throw new Error('Request not found or access denied');
    }

    return await prisma.purchaseRequest.delete({ where: { id: requestId } });
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

    const updatedRequest = await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status }
    });

    await NotificationService.createNotification(
      request.userId,
      `Purchase Request ${status.charAt(0) + status.slice(1).toLowerCase()}`,
      `Your purchase request for "${request.bookTitle}" has been ${status.toLowerCase()}.`,
      'Purchase'
    );

    return updatedRequest;
  }
}
