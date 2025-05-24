export interface userJwtPayload {
    // Define your expected payload shape here
    userId: string;
    email: string;
    collegeCode: 'GICCL' | string
    isEmailVerified: boolean;
    iat?: number;
    exp?: number;
}

export interface redisVerificationCode {
    code: string;
    id: string
}