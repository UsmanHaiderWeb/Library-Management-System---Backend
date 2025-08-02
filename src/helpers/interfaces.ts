import { Request } from "express";

export interface userJwtPayload {
    userId: string;
    email: string;
    collegeCode: 'GICCL' | string
    isEmailVerified: boolean;
    iat?: number;
    exp?: number;
}

export interface adminJwtPayload {
    adminId: string;
    email: string;
    collegeCode: 'GICCL' | string
    iat?: number;
    exp?: number;
}

export interface redisVerificationCode {
    code: string;
    id: string
}

export interface RequestWithAdmin extends Request {
    admin: {
        id: string;
        name: string;
        email: string;
        collegeId: string
    };
}


export interface RequestWithUser extends Request {
    user: {
        id: string;
        name: string;
        email: string;
        collegeId: string
    };
}