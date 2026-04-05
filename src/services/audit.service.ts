import { prisma } from '../helpers/prismaDb';

export interface AuditLogEntry {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
}

export class AuditService {
  /**
   * Log an admin action
   */
  static async log(entry: AuditLogEntry) {
    try {
      return await prisma.auditLog.create({
        data: {
          adminId: entry.adminId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId || null,
          details: entry.details || null,
          ipAddress: entry.ipAddress || null,
        },
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
      return null;
    }
  }

  /**
   * Get audit logs with pagination
   */
  static async getLogs(params: {
    pageNumber?: number;
    pageSize?: number;
    action?: string;
    entity?: string;
    adminId?: string;
  }) {
    const { pageNumber = 0, pageSize = 20, action, entity, adminId } = params;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (adminId) where.adminId = adminId;

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pageNumber * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  /**
   * Get distinct action types for filtering
   */
  static async getActionTypes() {
    const results = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return results.map((r: { action: string }) => r.action);
  }

  /**
   * Get distinct entity types for filtering
   */
  static async getEntityTypes() {
    const results = await prisma.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      orderBy: { entity: 'asc' },
    });
    return results.map((r: { entity: string }) => r.entity);
  }
}
