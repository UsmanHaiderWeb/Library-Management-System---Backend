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
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../../app"));
const prismaDb_1 = require("../../src/helpers/prismaDb");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
jest.mock('../src/helpers/prismaDb', () => ({
    prisma: {
        admin: {
            findUnique: jest.fn(),
        },
        college: {
            findFirst: jest.fn(),
        }
    },
}));
jest.mock('bcryptjs');
describe('Admin Auth API', () => {
    describe('POST /api/admin/login', () => {
        it('should login successfully with correct credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockAdmin = {
                id: 'admin-123',
                email: 'admin@example.com',
                password: 'hashed-password',
                collegeId: 'college-123',
                College: { name: 'Test College', code: 'TC1' }
            };
            prismaDb_1.prisma.admin.findUnique.mockResolvedValue(mockAdmin);
            bcryptjs_1.default.compare.mockResolvedValue(true);
            const response = yield (0, supertest_1.default)(app_1.default)
                .post('/api/admin/login')
                .send({ email: 'admin@example.com', password: 'password123' });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
            expect(response.body.admin.email).toBe('admin@example.com');
        }));
        it('should fail with incorrect password', () => __awaiter(void 0, void 0, void 0, function* () {
            prismaDb_1.prisma.admin.findUnique.mockResolvedValue({
                password: 'hashed-password'
            });
            bcryptjs_1.default.compare.mockResolvedValue(false);
            const response = yield (0, supertest_1.default)(app_1.default)
                .post('/api/admin/login')
                .send({ email: 'admin@example.com', password: 'wrong' });
            expect(response.status).toBe(401);
            expect(response.body.message).toBe('Invalid email or password');
        }));
    });
});
