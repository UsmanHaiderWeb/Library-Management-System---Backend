import { BookService } from '../../src/services/book.service';
import { prisma } from '../../src/helpers/prismaDb';

jest.mock('../src/helpers/prismaDb', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe('BookService', () => {
  describe('getAllBooks', () => {
    it('should return a list of books with pagination', async () => {
      const mockBooks = [{ id: '1', bookName: 'Book 1' }, { id: '2', bookName: 'Book 2' }];
      (prisma.book.findMany as jest.Mock).mockResolvedValue(mockBooks);
      (prisma.book.count as jest.Mock).mockResolvedValue(2);

      const result = await BookService.getAllBooks({ page: 1, limit: 10 });

      expect(result.books).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prisma.book.findMany).toHaveBeenCalled();
    });
  });

  describe('getBookDetails', () => {
    it('should return book details if found', async () => {
      const mockBook = { id: '1', bookName: 'Book 1', copies: [] };
      (prisma.book.findUnique as jest.Mock).mockResolvedValue(mockBook);

      const result = await BookService.getBookDetails('1');

      expect(result).toEqual(mockBook);
    });

    it('should throw error if book not found', async () => {
      (prisma.book.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(BookService.getBookDetails('invalid')).rejects.toThrow('Book not found');
    });
  });
});
