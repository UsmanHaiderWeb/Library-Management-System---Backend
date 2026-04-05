import { Request, Response } from 'express';
import { AuditService } from '../../services/audit.service';
import logger from '../../helpers/logger';

/**
 * Get audit logs with pagination and optional filters (Admin only)
 */
export const getAuditLogsController = async (req: Request, res: Response) => {
  try {
    const pageNumber = parseInt(req.query.pageNumber as string) || 0;
    const action = req.query.action as string | undefined;
    const entity = req.query.entity as string | undefined;

    const result = await AuditService.getLogs({
      pageNumber,
      pageSize: 20,
      action,
      entity,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
};

/**
 * Get available filter options for audit logs
 */
export const getAuditFiltersController = async (_req: Request, res: Response) => {
  try {
    const [actions, entities] = await Promise.all([
      AuditService.getActionTypes(),
      AuditService.getEntityTypes(),
    ]);

    res.json({
      success: true,
      actions,
      entities,
    });
  } catch (error) {
    logger.error('Error fetching audit filters:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch filters' });
  }
};
