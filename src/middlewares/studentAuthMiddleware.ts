/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../helpers/verifyToken";
import { userJwtPayload } from "../helpers/interfaces";
import { prisma } from "../helpers/prismaDb";
import { redisClient } from "../helpers/redisClient";
import { College, User } from "@prisma/client";

export const studentAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req?.headers?.authorization?.split('Bearer ')[1] || '';

        if (!token) {
            res.status(401).json({ message: "Unauthorized." })
            return;
        }


        // verify token
        const decodedToken = verifyToken(token) as userJwtPayload;
        if (!decodedToken || !decodedToken.userId || !decodedToken?.collegeCode || !decodedToken?.email
            //  || !decodedToken?.isEmailVerified
        ) {
            res.status(401).json({ message: "Invalid or expired token" })
            return;
        }


        // find college
        let college: College | any;
        college = await redisClient.hgetall(`college:${decodedToken?.collegeCode}`) as unknown as College;
        if (!college.id || !college?.code || (college?.code != decodedToken?.collegeCode) || (decodedToken?.collegeCode != college.code)) {
            college = await prisma.college.findUnique({
                where: {
                    code: decodedToken?.collegeCode
                },
                select: {
                    id: true,
                    code: true
                }
            })
            if (!college?.id || !college.code || (college?.code != decodedToken?.collegeCode)) {
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
        let dataToBeStored;
        let user;
        user = await redisClient.hgetall(`user:${decodedToken?.userId}:data`) as unknown as User;
        if (!user.id || !user.collegeId) {
            user = await prisma.user.findUnique({
                where: {
                    id: decodedToken?.userId,
                    email: decodedToken?.email,
                    collegeId: college?.id,
                },
            })
            if (!user) {
                res.status(400).json({ message: "Invalid or expired token." })
                return;
            }

            dataToBeStored = {
                id: user?.id,
                name: user?.name,
                email: user?.email,
                phoneNumber: user?.phoneNumber,
                studentId: user?.studentId,
                collegeId: college?.id,
                isEmailVerified: user?.isEmailVerified,
            };

            console.log("dataToBeStored: ", dataToBeStored);
            
            await redisClient.hset(`user:${user?.id}:data`, dataToBeStored);
            await redisClient.expire(`user:${user?.id}:data`, 60 * 60 * 24 * 7);
        }
        
        
        // pass user to the request object
        console.log("user?.id ? user : dataToBeStored", user?.id ? user : `dataToBeStored${dataToBeStored}`);
        (req as any).user = user?.id ? user : dataToBeStored;

        next()
    } catch (error) {
        console.error('get user details middleware error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
}