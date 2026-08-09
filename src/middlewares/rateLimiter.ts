import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createHash } from 'crypto';
import { Request } from 'express';

/**
 * Rate-limit bucket key.
 *
 * A college campus typically sits behind a single public IP, so keying purely
 * on IP would make every student on campus share one quota — a busy afternoon
 * at the library desk would throttle the whole institution. Authenticated
 * callers therefore get their own bucket, derived from their bearer token
 * (hashed — the raw token never enters the limiter's key store). Anonymous
 * traffic still falls back to IP.
 *
 * Note this runs before the auth middlewares, so the token is all we have;
 * an invalid token simply gets its own useless bucket and still fails auth.
 */
const keyByTokenOrIp = (req: Request): string => {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
        const token = auth.slice(7).trim();
        if (token) {
            return `tok:${createHash('sha256').update(token).digest('hex').slice(0, 32)}`;
        }
    }
    return ipKeyGenerator(req.ip ?? '');
};

// Strict limiter for auth routes (login, signup, password reset).
// Deliberately IP-keyed: credential stuffing arrives without a valid token.
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per window
    message: { message: 'Too many attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API limiter
export const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 300, // per authenticated user (or per IP for anonymous traffic)
    keyGenerator: keyByTokenOrIp,
    message: { message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false,
});
