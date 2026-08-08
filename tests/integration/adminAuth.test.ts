import request from 'supertest';
import app from '../../app';
import { prisma } from '../../src/helpers/prismaDb';
import bcrypt from 'bcryptjs';

jest.mock('../../src/helpers/prismaDb', () => ({
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
    it('should login successfully with correct credentials', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        password: 'hashed-password',
        collegeId: 'college-123',
        College: { name: 'Test College', code: 'TC1' }
      };

      (prisma.admin.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .post('/api/admin/login')
        .send({ email: 'admin@example.com', password: 'password123', collegeCode: 'TC1' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.message).toBe('Admin Login successful');
    });

    it('should fail with incorrect password', async () => {
      (prisma.admin.findUnique as jest.Mock).mockResolvedValue({
        password: 'hashed-password'
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .post('/api/admin/login')
        .send({ email: 'admin@example.com', password: 'wrong', collegeCode: 'TC1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });
});
