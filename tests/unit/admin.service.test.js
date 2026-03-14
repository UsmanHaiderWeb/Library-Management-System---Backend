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
const admin_service_1 = require("../../src/services/admin.service");
const prismaDb_1 = require("../../src/helpers/prismaDb");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
jest.mock('../src/helpers/prismaDb', () => ({
    prisma: {
        admin: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        college: {
            findUnique: jest.fn(),
        },
    },
}));
jest.mock('bcryptjs');
describe('AdminService', () => {
    describe('signup', () => {
        it('should create a new admin successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const signupData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test Admin',
                collegeCode: 'COL1',
            };
            prismaDb_1.prisma.college.findUnique.mockResolvedValue({ id: 'college-id', code: 'COL1' });
            prismaDb_1.prisma.admin.findUnique.mockResolvedValue(null);
            bcryptjs_1.default.hash.mockResolvedValue('hashed-password');
            prismaDb_1.prisma.admin.create.mockResolvedValue(Object.assign({ id: 'admin-id' }, signupData));
            const result = yield admin_service_1.AdminService.signup(signupData);
            expect(result).toHaveProperty('id');
            expect(prismaDb_1.prisma.admin.create).toHaveBeenCalled();
        }));
        it('should throw error if admin already exists', () => __awaiter(void 0, void 0, void 0, function* () {
            prismaDb_1.prisma.admin.findUnique.mockResolvedValue({ id: 'existing' });
            yield expect(admin_service_1.AdminService.signup({
                email: 'test@example.com',
                password: 'pass',
                name: 'name',
                collegeCode: 'COL1',
            })).rejects.toThrow('Admin already exists');
        }));
    });
});
