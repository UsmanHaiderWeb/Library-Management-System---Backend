/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../helpers/verifyToken";
import { userJwtPayload } from "../helpers/interfaces";
import { prisma } from "../helpers/prismaDb";
import { redisClient } from "../helpers/redisClient";
import { User } from "@prisma/client";

export const studentAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req?.headers?.authorization?.split(' ')[1] || '';

        if (!token) {
            res.status(401).json({ message: "Unauthorized." })
        }


        // verify token
        const decodedToken = verifyToken(token) as userJwtPayload;
        if (!decodedToken || !decodedToken.userId || !decodedToken?.collegeCode || !decodedToken?.email || !decodedToken?.isEmailVerified) {
            res.status(401).json({ message: "Invalid or expired token" })
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


        // find then user
        let user;
        let dataToBeStored;
        const userDataFromRedis = await redisClient.hgetall(`user:${decodedToken?.userId}:data`) as unknown as User;
        if (!userDataFromRedis.id) {
            user = await prisma.user.findUnique({
                where: {
                    id: decodedToken?.userId,
                    email: decodedToken?.email,
                    collegeId: collegeDataFromRedis?.id || college?.id,
                },
            })
            if (!user) {
                res.status(400).json({ message: "Invalid or expired token." })
                return;
            }

            dataToBeStored = {
                name: user?.name,
                email: user?.email,
                phoneNumber: user?.phoneNumber,
                studentId: user?.studentId
            };

            await redisClient.hset(`user:${user?.id}:data`, dataToBeStored);
            await redisClient.expire(`user:${user?.id}:data`, 60 * 60 * 24 * 7);
        }


        // pass user to the request object
        (req as any).user = userDataFromRedis?.id ? userDataFromRedis : dataToBeStored;

        next()
    } catch (error) {
        console.error('get user details middleware error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}