import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import morgan from 'morgan';
import logger from '../helpers/logger';

/**
 * Assigns a correlation id to every request and echoes it back as X-Request-Id.
 * When a college reports "this failed at 2pm", this is what ties their report
 * to a specific line in the logs.
 */
export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    (req as Request & { requestId: string }).requestId = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
};

// --- custom morgan tokens -------------------------------------------------

morgan.token('request-id', (req) => (req as Request & { requestId?: string }).requestId || '-');

// Who performed the request — populated by the auth middlewares, which have
// already run by the time morgan logs (on response finish).
morgan.token('actor', (req) => {
    const r = req as Request & { admin?: { id: string }; user?: { id: string } };
    if (r.admin?.id) return `admin:${r.admin.id}`;
    if (r.user?.id) return `user:${r.user.id}`;
    return 'anonymous';
});

/** Swagger UI assets and health pings would drown out real traffic. */
const skip = (req: Request) =>
    req.originalUrl.startsWith('/api-docs') || req.originalUrl === '/favicon.ico';

/**
 * Production: one JSON object per request, emitted through Winston so it lands
 * in the same transports (console + files) as everything else.
 */
const jsonFormat = morgan(
    (tokens, req, res) =>
        JSON.stringify({
            requestId: tokens['request-id'](req, res),
            method: tokens.method(req, res),
            url: tokens.url(req, res),
            status: Number(tokens.status(req, res)) || 0,
            responseTimeMs: Number(tokens['response-time'](req, res)) || 0,
            contentLength: tokens.res(req, res, 'content-length') || 0,
            actor: tokens.actor(req, res),
            ip: tokens['remote-addr'](req, res),
            userAgent: tokens['user-agent'](req, res),
        }),
    {
        skip,
        stream: {
            write: (message: string) => {
                try {
                    const { status, ...rest } = JSON.parse(message);
                    // 5xx is an operational problem, 4xx is a client mistake
                    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
                    logger.log(level, 'http_request', { status, ...rest });
                } catch {
                    logger.info(message.trim());
                }
            },
        },
    }
);

/** Development: short, readable, still through Winston. */
const devFormat = morgan(
    (tokens, req, res) =>
        `${tokens.method(req, res)} ${tokens.url(req, res)} ${tokens.status(req, res)} ` +
        `${tokens['response-time'](req, res)}ms [${tokens.actor(req, res)}]`,
    {
        skip,
        stream: {
            write: (message: string) => {
                const line = message.trim();
                const status = Number(line.match(/\s(\d{3})\s/)?.[1]) || 0;
                const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
                logger.log(level, line);
            },
        },
    }
);

export const requestLogger =
    process.env.NODE_ENV === 'production' ? jsonFormat : devFormat;
