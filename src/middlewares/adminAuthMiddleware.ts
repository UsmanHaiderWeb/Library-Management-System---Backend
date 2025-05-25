/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../helpers/verifyToken";
import { adminJwtPayload } from "../helpers/interfaces";
import { prisma } from "../helpers/prismaDb";
import { redisClient } from "../helpers/redisClient";
import { Admin } from "@prisma/client";

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


        // find college
        let college;
        const collegeDataFromRedis = await redisClient.hgetall(`college:${decodedToken?.collegeCode}`);
        if (!collegeDataFromRedis.id || (collegeDataFromRedis?.code != decodedToken?.collegeCode)) {
            college = await prisma.college.findUnique({
                where: {
                    code: decodedToken?.collegeCode
                }
            })
            if (!college) {
                res.status(400).json({ message: "Invalid college code" })
                return;
            }

            await redisClient.hset(`college:${decodedToken?.collegeCode}`, {
                id: college?.id,
                code: college?.code
            });
            await redisClient.expire(`college:${decodedToken?.collegeCode}`, 60 * 60 * 24 * 7);
        }


        // find then admin
        let admin;
        let dataToBeStored;
        const adminDataFromRedis = await redisClient.hgetall(`admin:${decodedToken?.adminId}:data`) as unknown as Admin;
        if (!adminDataFromRedis.id) {
            admin = await prisma.admin.findUnique({
                where: {
                    id: decodedToken?.adminId,
                    email: decodedToken?.email,
                    collegeId: collegeDataFromRedis?.id || college?.id,
                },
            })
            if (!admin) {
                res.status(400).json({ message: "Invalid or expired token." })
                return;
            }

            dataToBeStored = {
                name: admin?.name,
                email: admin?.email,
                collegeId: collegeDataFromRedis.id || college?.id,
            };

            await redisClient.hset(`admin:${admin?.id}:data`, dataToBeStored);
            await redisClient.expire(`admin:${admin?.id}:data`, 60 * 60 * 24 * 7);
        }


        // pass admin to the request object
        (req as any).admin = adminDataFromRedis?.id ? adminDataFromRedis : dataToBeStored;

        next()
    } catch (error) {
        console.error('get admin details middleware error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
}