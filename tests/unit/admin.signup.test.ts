import { AdminService } from '../../src/services/admin.service';
import { prisma } from '../../src/helpers/prismaDb';

jest.mock('../../src/helpers/prismaDb', () => ({
    prisma: {
        college: { findUnique: jest.fn() },
        admin: { count: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
        $transaction: jest.fn(),
    },
}));

const mockPrisma = prisma as unknown as {
    college: { findUnique: jest.Mock };
    admin: { count: jest.Mock; findUnique: jest.Mock; create: jest.Mock };
    $transaction: jest.Mock;
};

const payload = {
    email: 'new@college.test',
    password: 'password123',
    name: 'New Librarian',
    collegeCode: 'GICCL',
};

describe('AdminService.signup', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockPrisma.college.findUnique.mockResolvedValue({ id: 'college-1', code: 'GICCL' });
        mockPrisma.admin.findUnique.mockResolvedValue(null);
        mockPrisma.$transaction.mockImplementation(async () => ({
            user: { id: 'admin-1', email: payload.email },
            token: 'signed-token',
        }));
    });

    it('creates the first librarian without a token, which is how an install bootstraps', async () => {
        mockPrisma.admin.count.mockResolvedValue(0);

        const result = await AdminService.signup(payload);

        expect(result.token).toBe('signed-token');
    });

    it('refuses an anonymous signup once the college has an admin', async () => {
        // The college code is compiled into the public student bundle, so an
        // open signup route hands full admin access to anyone who reads it.
        mockPrisma.admin.count.mockResolvedValue(1);

        await expect(AdminService.signup(payload)).rejects.toThrow('Admin signup is closed');
        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('lets an already signed-in admin add a colleague', async () => {
        mockPrisma.admin.count.mockResolvedValue(1);

        const result = await AdminService.signup(payload, true);

        expect(result.token).toBe('signed-token');
    });

    it('still rejects an unknown college code', async () => {
        mockPrisma.college.findUnique.mockResolvedValue(null);

        await expect(AdminService.signup(payload)).rejects.toThrow('Invalid college code.');
    });
});
