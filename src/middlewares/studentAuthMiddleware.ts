/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../helpers/verifyToken";
import { userJwtPayload } from "../helpers/interfaces";
import { prisma } from "../helpers/prismaDb";

export const studentAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const token = req?.headers?.authorization?.split(' ')[1] || '';

        if (!token) {
            res.status(401).json({ message: "Unauthorized." })
        }

        // verify token
        const decodedToken = verifyToken(token) as userJwtPayload;
        if (!decodedToken || !decodedToken.userId || !decodedToken?.collegeCode || !decodedToken?.email) {
            res.status(401).json({ message: "Invalid or expired token" })
        }

        // check is ip verified
        // const ip = await prisma.ipAddressess.findFirst({
        //     where: {
        //         ipAddress: req.ip || '',
        //         isVerified: true,
        //         userId: decodedToken?.userId
        //     }
        // })
        // if (!ip) {
        //     res.status(400).json({ message: "This ip address is not verified.", ip: req.ip || '' })
        // }

        // find college
        const college = await prisma.college.findUnique({
            where: {
                code: decodedToken?.collegeCode
            }
        })
        if (!college) {
            res.status(400).json({ message: "Invalid college code" })
        }

        // find then user
        const user = await prisma.user.findUnique({
            where: {
                id: decodedToken?.userId,
                email: decodedToken?.email,
                collegeId: college?.id,
            },
        })
        if (!user) {
            res.status(400).json({ message: "Invalid or expired token." })
        }
        (req as any).user = {
            name: user?.name,
            email: user?.email,
            phoneNumber: user?.phoneNumber,
            studentId: user?.studentId,
        };

        next()
    } catch (error) {
        console.error('get user details middleware error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}