export interface userJwtPayload {
    // Define your expected payload shape here
    userId: string;
    email: string;
    collegeCode: 'GICCL' | string
    iat?: number;
    exp?: number;
}