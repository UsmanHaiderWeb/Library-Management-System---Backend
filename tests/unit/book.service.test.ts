import { BookService } from '../../src/services/book.service';
import { prisma } from '../../src/helpers/prismaDb';

jest.mock('../../src/helpers/prismaDb', () => ({
  prisma: {
    book: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
    bookSlug: {
      findFirst: jest.fn(),
    },
  },
}));

const bookFindFirst = prisma.book.findFirst as jest.Mock;
const slugFindFirst = prisma.bookSlug.findFirst as jest.Mock;

describe('BookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllBooks', () => {
    it('should return a list of books with pagination', async () => {
      const mockBooks = [{ id: '1', bookName: 'Book 1' }, { id: '2', bookName: 'Book 2' }];
      (prisma.book.findMany as jest.Mock).mockResolvedValue(mockBooks);
      (prisma.book.count as jest.Mock).mockResolvedValue(2);

      const result = await BookService.getAllBooks({ collegeId: 'college-123', pageNumber: 1 });

      expect(result.books).toHaveLength(2);
      expect(result.totalCount).toBe(2);
      expect(prisma.book.findMany).toHaveBeenCalled();
    });
  });

  describe('getBookDetails', () => {
    const book = { id: 'book-1', slug: 'clean-code', bookName: 'Clean Code', copies: [] };

    it('returns the book when the current slug is used, with no redirect', async () => {
      bookFindFirst.mockResolvedValueOnce(book);

      const result = await BookService.getBookDetails('clean-code', 'TC1');

      expect(result).toEqual(book);
      expect(result).not.toHaveProperty('redirectTo');
      // Matched on the first try — no id or history lookup needed
      expect(bookFindFirst).toHaveBeenCalledTimes(1);
      expect(slugFindFirst).not.toHaveBeenCalled();
    });

    it('redirects to the slug when looked up by id', async () => {
      bookFindFirst
        .mockResolvedValueOnce(null)   // not a slug
        .mockResolvedValueOnce(book);  // is an id

      const result = await BookService.getBookDetails('book-1', 'TC1');

      expect(result).toMatchObject({ id: 'book-1', redirectTo: 'clean-code' });
    });

    it('resolves a retired slug and redirects to the current one', async () => {
      bookFindFirst
        .mockResolvedValueOnce(null)   // not the current slug
        .mockResolvedValueOnce(null);  // not an id
      slugFindFirst.mockResolvedValueOnce({ bookId: 'book-1' });
      bookFindFirst.mockResolvedValueOnce({ ...book, slug: 'clean-code-2nd-edition' });

      const result = await BookService.getBookDetails('clean-code', 'TC1');

      expect(result).toMatchObject({ redirectTo: 'clean-code-2nd-edition' });
    });

    it('returns null when nothing matches', async () => {
      bookFindFirst.mockResolvedValue(null);
      slugFindFirst.mockResolvedValue(null);

      // The controller translates null into a 404 — the service itself does not throw
      await expect(BookService.getBookDetails('nope', 'TC1')).resolves.toBeNull();
    });

    it('falls back to the id when a book somehow has no slug', async () => {
      bookFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      slugFindFirst.mockResolvedValueOnce({ bookId: 'book-1' });
      bookFindFirst.mockResolvedValueOnce({ ...book, slug: null });

      const result = await BookService.getBookDetails('old-slug', 'TC1');

      expect(result).toMatchObject({ redirectTo: 'book-1' });
    });
  });
});
