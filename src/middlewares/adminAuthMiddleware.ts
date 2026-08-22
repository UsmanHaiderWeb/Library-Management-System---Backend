/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../helpers/verifyToken";
import { adminJwtPayload } from "../helpers/interfaces";
import { prisma } from "../helpers/prismaDb";
import { redisClient } from "../helpers/redisClient";
import { Admin } from "@prisma/client";
import logger from '../helpers/logger';

export const adminAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req?.headers?.authorization?.split('Bearer ')[1] || '';

        if (!token) {
            res.status(401).json({ message: "Unauthorized." })
            return;
        }


        // verify token
        const decodedToken = verifyToken(token) as adminJwtPayload;
        if (!decodedToken || !decodedToken.adminId || !decodedToken?.collegeCode || !decodedToken?.email) {
            res.status(401).json({ message: "Invalid or expired token" })
            return;
        }


        const collegeCacheKey = `college:${decodedToken?.collegeCode}`;

        const loadCollegeFromDb = async () => {
            const fresh = await prisma.college.findUnique({
                where: { code: decodedToken?.collegeCode }
            });
            if (!fresh) return null;

            await redisClient.hset(collegeCacheKey, { id: fresh.id, code: fresh.code });
            await redisClient.expire(collegeCacheKey, 60 * 60 * 24 * 7);
            return { id: fresh.id, code: fresh.code };
        };

        // find college (cached for a week)
        const cachedCollege = await redisClient.hgetall(collegeCacheKey);
        let college = cachedCollege?.id && cachedCollege?.code === decodedToken?.collegeCode
            ? { id: cachedCollege.id, code: cachedCollege.code }
            : await loadCollegeFromDb();

        if (!college) {
            res.status(400).json({ message: "Invalid college code" })
            return;
        }


        // find then admin
        let dataToBeStored;
        let admin;
        admin = await redisClient.hgetall(`admin:${decodedToken?.adminId}:data`) as unknown as Admin;
        if (!admin?.id || !admin?.collegeId) {
            const lookup = () => prisma.admin.findUnique({
                where: {
                    id: decodedToken?.adminId,
                    email: decodedToken?.email,
                    collegeId: college!.id,
                },
            });

            admin = await lookup() as Admin;

            // A cached college id can go stale — e.g. the college row was
            // re-provisioned or the database restored from a backup. Without
            // this retry every admin is locked out, with a misleading
            // "invalid token" message, until the week-long cache expires.
            if (!admin) {
                const refreshed = await loadCollegeFromDb();
                if (refreshed && refreshed.id !== college.id) {
                    logger.warn('Stale cached college id detected; refreshed from database', {
                        collegeCode: decodedToken?.collegeCode,
                    });
                    college = refreshed;
                    admin = await lookup() as Admin;
                }
            }

            if (!admin) {
                res.status(400).json({ message: "Invalid or expired token." })
                return;
            }

            dataToBeStored = {
                id: admin?.id,
                name: admin?.name,
                email: admin?.email,
                collegeId: college?.id,
            };

            await redisClient.hset(`admin:${admin?.id}:data`, dataToBeStored);
            await redisClient.expire(`admin:${admin?.id}:data`, 60 * 60 * 24 * 7);
        }


        // pass admin to the request object
        (req as any).admin = admin?.id ? admin : dataToBeStored;

        next()
    } catch (error) {
        logger.error('get admin details middleware error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
}
/**
 * Runs adminAuthMiddleware only when a token was actually supplied, and never
 * rejects the request itself.
 *
 * Used by admin signup, which has to serve two callers with one route: the
 * installer creating the very first librarian (no token yet, allowed exactly
 * once) and an existing librarian adding a colleague (token required). The
 * decision belongs to the service, which needs to know whether someone is
 * signed in -- not whether they had to be.
 */
export const optionalAdminAuthMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const token = req?.headers?.authorization?.split('Bearer ')[1] || '';
    if (!token) {
        next();
        return;
    }

    // A bad token must still fail loudly rather than silently downgrade to
    // "not signed in", which would look like the open first-admin path.
    await adminAuthMiddleware(req, res, next);
};
