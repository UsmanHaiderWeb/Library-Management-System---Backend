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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prismaDb_1 = require("../helpers/prismaDb");
const config_1 = require("../config");
class AdminService {
    /**
     * Register a new admin
     */
    static signup(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password, name, collegeCode } = data;
            // Check if college exists
            const college = yield prismaDb_1.prisma.college.findUnique({
                where: { code: collegeCode }
            });
            if (!college) {
                throw new Error('Invalid college code.');
            }
            // Check if admin already exists
            const existingUser = yield prismaDb_1.prisma.admin.findUnique({
                where: { email }
            });
            if (existingUser) {
                throw new Error('Admin already exists');
            }
            // Hash password
            const salt = yield bcryptjs_1.default.genSalt(10);
            const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
            const result = yield prismaDb_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // Create admin
                const user = yield tx.admin.create({
                    data: {
                        email,
                        password: hashedPassword,
                        name,
                        collegeId: college.id
                    }
                });
                const token = jsonwebtoken_1.default.sign({
                    adminId: user.id,
                    email: user.email,
                    collegeCode: college.code
                }, config_1.config.JWT_SECRET, { expiresIn: '1h' });
                return { user, token };
            }));
            return result;
        });
    }
    /**
     * Authenticate an admin
     */
    static login(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { email, password } = data;
            // Find admin
            const admin = yield prismaDb_1.prisma.admin.findUnique({
                where: { email },
                include: {
                    College: true
                }
            });
            if (!admin) {
                throw new Error('Invalid credentials');
            }
            // Check password
            const isMatch = yield bcryptjs_1.default.compare(password, admin.password);
            if (!isMatch) {
                throw new Error('Invalid credentials');
            }
            // Generate JWT token
            const token = jsonwebtoken_1.default.sign({
                adminId: admin.id,
                email: admin.email,
                collegeCode: (_a = admin.College) === null || _a === void 0 ? void 0 : _a.code,
            }, config_1.config.JWT_SECRET, { expiresIn: '7d' });
            return { admin, token };
        });
    }
    /**
     * Get dashboard statistics for a college
     */
    static getDashboardStats(collegeId) {
        return __awaiter(this, void 0, void 0, function* () {
            const [totalBooks, totalStudents, pendingRequests, activeLoans] = yield Promise.all([
                prismaDb_1.prisma.book.count({ where: { collegeId } }),
                prismaDb_1.prisma.user.count({ where: { collegeId } }),
                prismaDb_1.prisma.borrowedRequests.count({ where: { collegeId, status: 'pending' } }),
                prismaDb_1.prisma.borrowedBook.count({ where: { collegeId, status: 'borrowed' } })
            ]);
            return {
                totalBooks,
                totalStudents,
                pendingRequests,
                activeLoans
            };
        });
    }
}
exports.AdminService = AdminService;
