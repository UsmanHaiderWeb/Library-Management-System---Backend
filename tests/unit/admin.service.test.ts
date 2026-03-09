import { AdminService } from '../../src/services/admin.service';
import { prisma } from '../../src/helpers/prismaDb';
import bcrypt from 'bcryptjs';

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
    it('should create a new admin successfully', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test Admin',
        collegeCode: 'COL1',
      };

      (prisma.college.findUnique as jest.Mock).mockResolvedValue({ id: 'college-id', code: 'COL1' });
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (prisma.admin.create as jest.Mock).mockResolvedValue({ id: 'admin-id', ...signupData });

      const result = await AdminService.signup(signupData);

      expect(result).toHaveProperty('id');
      expect(prisma.admin.create).toHaveBeenCalled();
    });

    it('should throw error if admin already exists', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(AdminService.signup({
        email: 'test@example.com',
        password: 'pass',
        name: 'name',
        collegeCode: 'COL1',
      })).rejects.toThrow('Admin already exists');
    });
  });
});
