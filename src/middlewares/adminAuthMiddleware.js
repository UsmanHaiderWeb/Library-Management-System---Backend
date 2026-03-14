"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAuthMiddleware = void 0;
const verifyToken_1 = require("../helpers/verifyToken");
const prismaDb_1 = require("../helpers/prismaDb");
const redisClient_1 = require("../helpers/redisClient");
const adminAuthMiddleware = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const token = ((_b = (_a = req === null || req === void 0 ? void 0 : req.headers) === null || _a === void 0 ? void 0 : _a.authorization) === null || _b === void 0 ? void 0 : _b.split('Bearer ')[1]) || '';
        if (!token) {
            res.status(401).json({ message: "Unauthorized." });
            return;
        }
        // verify token
        const decodedToken = (0, verifyToken_1.verifyToken)(token);
        if (!decodedToken || !decodedToken.adminId || !(decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.collegeCode) || !(decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.email)) {
            res.status(401).json({ message: "Invalid or expired token" });
            return;
        }
        // find college
        let college;
        college = yield redisClient_1.redisClient.hgetall(`college:${decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.collegeCode}`);
        if (!college.id || !(college === null || college === void 0 ? void 0 : college.code) || ((college === null || college === void 0 ? void 0 : college.code) != (decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.collegeCode)) || ((decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.collegeCode) != college.code)) {
            college = yield prismaDb_1.prisma.college.findUnique({
                where: {
                    code: decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.collegeCode
                }
            });
            if (!college) {
                res.status(400).json({ message: "Invalid college code" });
                return;
            }
            yield redisClient_1.redisClient.hset(`college:${decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.collegeCode}`, {
                id: college === null || college === void 0 ? void 0 : college.id,
                code: college === null || college === void 0 ? void 0 : college.code
            });
            yield redisClient_1.redisClient.expire(`college:${decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.collegeCode}`, 60 * 60 * 24 * 7);
        }
        // find then admin
        let dataToBeStored;
        let admin;
        admin = (yield redisClient_1.redisClient.hgetall(`admin:${decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.adminId}:data`));
        if (!(admin === null || admin === void 0 ? void 0 : admin.id) || !(admin === null || admin === void 0 ? void 0 : admin.collegeId)) {
            admin = yield prismaDb_1.prisma.admin.findUnique({
                where: {
                    id: decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.adminId,
                    email: decodedToken === null || decodedToken === void 0 ? void 0 : decodedToken.email,
                    collegeId: college === null || college === void 0 ? void 0 : college.id,
                },
            });
            if (!admin) {
                res.status(400).json({ message: "Invalid or expired token." });
                return;
            }
            dataToBeStored = {
                id: admin === null || admin === void 0 ? void 0 : admin.id,
                name: admin === null || admin === void 0 ? void 0 : admin.name,
                email: admin === null || admin === void 0 ? void 0 : admin.email,
                collegeId: college === null || college === void 0 ? void 0 : college.id,
            };
            yield redisClient_1.redisClient.hset(`admin:${admin === null || admin === void 0 ? void 0 : admin.id}:data`, dataToBeStored);
            yield redisClient_1.redisClient.expire(`admin:${admin === null || admin === void 0 ? void 0 : admin.id}:data`, 60 * 60 * 24 * 7);
        }
        // pass admin to the request object
        req.admin = (admin === null || admin === void 0 ? void 0 : admin.id) ? admin : dataToBeStored;
        next();
    }
    catch (error) {
        console.error('get admin details middleware error:', error);
        res.status(500).json({ message: 'Server error' });
        return;
    }
});
exports.adminAuthMiddleware = adminAuthMiddleware;
