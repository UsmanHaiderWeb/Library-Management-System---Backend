import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';

/**
 * Mapping of route patterns to audit action descriptions.
 * Key: "METHOD /path-pattern" — path params replaced with `:param`.
 */
const ACTION_MAP: Record<string, { action: string; entity: string }> = {
  // Account verification
  'POST /api/admin/verify-account': { action: 'APPROVE_ACCOUNT', entity: 'User' },
  'POST /api/admin/deny-account': { action: 'DENY_ACCOUNT', entity: 'User' },
  'POST /api/admin/verify-student-email': { action: 'VERIFY_STUDENT_EMAIL', entity: 'User' },

  // User management
  'PATCH /api/admin/update-user-role': { action: 'UPDATE_ROLE', entity: 'User' },

  // Borrow management
  'POST /api/admin/borrow-requests/change-status': { action: 'CHANGE_BORROW_STATUS', entity: 'BorrowRequest' },
  'POST /api/admin/borrowed-books': { action: 'CHANGE_RETURN_STATUS', entity: 'BorrowedBook' },

  // Purchase requests
  'POST /api/admin/purchase-requests': { action: 'UPDATE_PURCHASE_STATUS', entity: 'PurchaseRequest' },
  'DELETE /api/admin/purchase-request': { action: 'DELETE_PURCHASE_REQUEST', entity: 'PurchaseRequest' },

  // Renewal requests
  'POST /api/admin/renewal-requests': { action: 'PROCESS_RENEWAL', entity: 'RenewalRequest' },

  // Fines (pay/waive share a prefix — the Fine record stores the outcome)
  'PATCH /api/admin/fines': { action: 'SETTLE_FINE', entity: 'Fine' },

  // Book management
  'POST /api/books/create': { action: 'CREATE_BOOK', entity: 'Book' },
  'POST /api/books/update': { action: 'UPDATE_BOOK', entity: 'Book' },
  'DELETE /api/books/delete': { action: 'DELETE_BOOK', entity: 'Book' },

  // Bulk import
  'POST /api/admin/import/books': { action: 'BULK_IMPORT_BOOKS', entity: 'Book' },
  'POST /api/admin/import/users': { action: 'BULK_IMPORT_USERS', entity: 'User' },

  // Overdue
  'POST /api/admin/overdue-reminders/trigger': { action: 'TRIGGER_REMINDERS', entity: 'Overdue' },
};

/**
 * Match a request to an action map entry.
 * Strips trailing path segments (IDs) to match the pattern prefix.
 */
function matchAction(method: string, path: string): { action: string; entity: string; entityId?: string } | null {
  // Try exact prefix matches, longest first
  const pathSegments = path.split('/').filter(Boolean);

  for (let len = pathSegments.length; len >= 2; len--) {
    const prefix = '/' + pathSegments.slice(0, len)?.join('/');
    const key = `${method} ${prefix}`;

    if (ACTION_MAP[key]) {
      const entityId = pathSegments.length > len ? pathSegments[len] : undefined;
      return { ...ACTION_MAP[key], entityId };
    }
  }

  return null;
}

/**
 * Audit logging middleware for admin write operations.
 * Mounted globally in app.ts (before the routers) and only logs non-GET requests.
 */
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Only audit mutations
  if (req.method === 'GET') {
    next();
    return;
  }

  const matched = matchAction(req.method, req.originalUrl.split('?')[0]);
  if (!matched) {
    next();
    return;
  }

  // Log after the response is sent (non-blocking).
  // req.admin is resolved HERE rather than above: this middleware is mounted
  // globally, but adminAuthMiddleware runs per-route, so req.admin does not
  // exist yet on the way in — only by the time the route responds.
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    const admin = (req as unknown as Record<string, unknown>).admin as { id: string; name?: string } | undefined;
    // Only log successful operations (2xx) performed by an authenticated admin
    if (admin?.id && res.statusCode >= 200 && res.statusCode < 300) {
      AuditService.log({
        adminId: admin.id,
        action: matched.action,
        entity: matched.entity,
        entityId: matched.entityId,
        details: `${matched.action} on ${matched.entity}${matched.entityId ? ` (${matched.entityId})` : ''}`,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.ip,
      }).catch(() => { /* swallow errors — audit should never break the request */ });
    }
    return originalJson(body);
  };

  next();
};
