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
const book_service_1 = require("../../src/services/book.service");
const prismaDb_1 = require("../../src/helpers/prismaDb");
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
        it('should return a list of books with pagination', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockBooks = [{ id: '1', bookName: 'Book 1' }, { id: '2', bookName: 'Book 2' }];
            prismaDb_1.prisma.book.findMany.mockResolvedValue(mockBooks);
            prismaDb_1.prisma.book.count.mockResolvedValue(2);
            const result = yield book_service_1.BookService.getAllBooks({ collegeId: 'college-123', pageNumber: 1 });
            expect(result.books).toHaveLength(2);
            expect(result.totalCount).toBe(2);
            expect(prismaDb_1.prisma.book.findMany).toHaveBeenCalled();
        }));
    });
    describe('getBookDetails', () => {
        it('should return book details if found', () => __awaiter(void 0, void 0, void 0, function* () {
            const mockBook = { id: '1', bookName: 'Book 1', copies: [] };
            prismaDb_1.prisma.book.findUnique.mockResolvedValue(mockBook);
            const result = yield book_service_1.BookService.getBookDetails('college-123', '1');
            expect(result).toEqual(mockBook);
        }));
        it('should throw error if book not found', () => __awaiter(void 0, void 0, void 0, function* () {
            prismaDb_1.prisma.book.findUnique.mockResolvedValue(null);
            yield expect(book_service_1.BookService.getBookDetails('college-123', 'invalid')).rejects.toThrow('Book not found');
        }));
    });
});
