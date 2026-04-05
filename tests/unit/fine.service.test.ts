import { FineService } from '../../src/services/fine.service';
import { prisma } from '../../src/helpers/prismaDb';

jest.mock('../../src/helpers/prismaDb', () => ({
  prisma: {
    fine: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('FineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFine', () => {
    it('should return 0 when dueDate is null', () => {
      const result = FineService.calculateFine(null, new Date('2025-01-15'));
      expect(result).toBe(0);
    });

    it('should return 0 when returned on or before the due date', () => {
      const dueDate = new Date('2025-01-15');
      const returnDate = new Date('2025-01-15');
      expect(FineService.calculateFine(dueDate, returnDate)).toBe(0);
    });

    it('should return 0 when returned before the due date', () => {
      const dueDate = new Date('2025-01-15');
      const returnDate = new Date('2025-01-10');
      expect(FineService.calculateFine(dueDate, returnDate)).toBe(0);
    });

    it('should calculate fine at 10 per day for overdue books', () => {
      const dueDate = new Date('2025-01-10');
      const returnDate = new Date('2025-01-13'); // 3 days late
      expect(FineService.calculateFine(dueDate, returnDate)).toBe(30);
    });

    it('should round up partial days', () => {
      const dueDate = new Date('2025-01-10T00:00:00Z');
      // Even 1 millisecond into the next day counts as a full day
      const returnDate = new Date('2025-01-11T01:00:00Z');
      const result = FineService.calculateFine(dueDate, returnDate);
      expect(result).toBeGreaterThanOrEqual(10);
    });
  });

  describe('applyFine', () => {
    it('should increment user fineBalance and create fine record', async () => {
      const tx = {
        user: { update: jest.fn().mockResolvedValue({}) },
        fine: { create: jest.fn().mockResolvedValue({}) },
      };

      await FineService.applyFine('user-1', 30, 'bb-1', 3, tx);

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { fineBalance: { increment: 30 } },
      });
      expect(tx.fine.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          borrowedBookId: 'bb-1',
          amount: 30,
          daysOverdue: 3,
        },
      });
    });

    it('should do nothing if amount is zero', async () => {
      const tx = {
        user: { update: jest.fn() },
        fine: { create: jest.fn() },
      };

      await FineService.applyFine('user-1', 0, 'bb-1', 0, tx);

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.fine.create).not.toHaveBeenCalled();
    });

    it('should do nothing if amount is negative', async () => {
      const tx = {
        user: { update: jest.fn() },
        fine: { create: jest.fn() },
      };

      await FineService.applyFine('user-1', -5, 'bb-1', 0, tx);

      expect(tx.user.update).not.toHaveBeenCalled();
      expect(tx.fine.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserFines', () => {
    it('should return fine history for a user', async () => {
      const mockFines = [
        { id: 'f1', amount: 30, daysOverdue: 3, borrowedBook: { bookCopy: { book: { bookName: 'Book A' } } } },
      ];
      (prisma.fine.findMany as jest.Mock).mockResolvedValue(mockFines);

      const result = await FineService.getUserFines('user-1');

      expect(result).toEqual(mockFines);
      expect(prisma.fine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('getCollegeFines', () => {
    it('should return paginated fines for a college', async () => {
      const mockFines = [{ id: 'f1', amount: 20 }];
      (prisma.fine.findMany as jest.Mock).mockResolvedValue(mockFines);
      (prisma.fine.count as jest.Mock).mockResolvedValue(1);

      const result = await FineService.getCollegeFines('college-1', 0, 20);

      expect(result).toEqual({
        fines: mockFines,
        totalPages: 1,
        totalCount: 1,
      });
      expect(prisma.fine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { borrowedBook: { collegeId: 'college-1' } },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      (prisma.fine.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.fine.count as jest.Mock).mockResolvedValue(45);

      const result = await FineService.getCollegeFines('college-1', 0, 20);

      expect(result.totalPages).toBe(3); // Math.ceil(45/20) = 3
      expect(result.totalCount).toBe(45);
    });

    it('should use default pagination values', async () => {
      (prisma.fine.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.fine.count as jest.Mock).mockResolvedValue(0);

      await FineService.getCollegeFines('college-1');

      expect(prisma.fine.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });
});
