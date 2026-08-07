/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../helpers/prismaDb';
import { getDateRangeQuery } from '../helpers/dateUtils';

export class BookService {
    /**
     * Get all books with advanced filtering and pagination
     */
    static async getAllBooks(params: {
        collegeId?: string;
        pageNumber?: number;
        searchQuery?: string;
        genre?: string;
        isOnline?: boolean;
        availableOnly?: boolean;
        pageSize?: number;
        fromDate?: string;
        toDate?: string;
    }) {
        const {
            collegeId,
            pageNumber = 0,
            searchQuery = '',
            genre,
            isOnline,
            availableOnly,
            pageSize = 20,
            fromDate,
            toDate
        } = params;

        const whereClause: any = {};
        if (collegeId) {
            whereClause.collegeId = collegeId;
        }

        if (searchQuery.trim() !== '') {
            whereClause.OR = [
                { bookNumber: { contains: searchQuery } },
                { isbn: { contains: searchQuery } },
                { bookName: { contains: searchQuery } },
                { genre: { contains: searchQuery } },
                { author: { contains: searchQuery } },
            ];
        }

        if (genre) {
            whereClause.genre = { contains: genre };
        }

        if (isOnline !== undefined) {
            whereClause.isOnline = isOnline;
        }

        if (availableOnly) {
            whereClause.copies = {
                some: {
                    isBorrowed: false,
                },
            };
        }

        const dateCondition = getDateRangeQuery(fromDate, toDate);
        if (dateCondition) {
            whereClause.createdAt = dateCondition;
        }

        const booksCount = await prisma.book.count({
            where: whereClause,
        });

        const books = await prisma.book.findMany({
            where: whereClause,
            skip: pageNumber * pageSize,
            take: pageSize,
            select: {
                id: true,
                bookNumber: true,
                isbn: true,
                bookName: true,
                author: true,
                createdAt: true,
                genre: true,
                almirahNumber: true,
                shelfNumber: true,
                image: true,
                bgColor: true,
                totalBooks: true,
                isOnline: true,
                _count: {
                    select: {
                        BorrowedRequests: true,
                        copies: {
                            where: {
                                isBorrowed: false,
                            },
                        },
                    },
                },
            },
        });

        return {
            books,
            totalPages: Math.ceil(booksCount / pageSize),
            totalCount: booksCount,
        };
    }

    /**
     * Get specific book details
     */
    static async getBookDetails(bookId: string, collegeCode: string) {
        return prisma.book.findUnique({
            where: {
                id: bookId,
                College: {
                    code: collegeCode,
                },
            },
            select: {
                id: true,
                bookNumber: true,
                isbn: true,
                bookName: true,
                summary: true,
                author: true,
                genre: true,
                bgColor: true,
                image: true,
                almirahNumber: true,
                shelfNumber: true,
                isOnline: true,
                onlineFileUrl: true,
                totalBooks: true,
                _count: {
                    select: {
                        copies: {
                            where: {
                                isBorrowed: false,
                            },
                        },
                    },
                },
            },
        });
    }
}
