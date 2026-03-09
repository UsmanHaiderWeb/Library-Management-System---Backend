import { prisma } from '../helpers/prismaDb';

export class BookService {
    /**
     * Get all books with advanced filtering and pagination
     */
    static async getAllBooks(params: {
        collegeId: string;
        pageNumber?: number;
        searchQuery?: string;
        genre?: string;
        isOnline?: boolean;
        availableOnly?: boolean;
        pageSize?: number;
    }) {
        const {
            collegeId,
            pageNumber = 0,
            searchQuery = '',
            genre,
            isOnline,
            availableOnly,
            pageSize = 20
        } = params;

        const whereClause: any = {
            collegeId,
        };

        const andConditions: any[] = [];

        if (searchQuery.trim() !== '') {
            andConditions.push({
                OR: [
                    { bookNumber: { contains: searchQuery } },
                    { bookName: { contains: searchQuery } },
                    { genre: { contains: searchQuery } },
                    { author: { contains: searchQuery } },
                ],
            });
        }

        if (genre) {
            andConditions.push({ genre: { contains: genre } });
        }

        if (isOnline !== undefined) {
            andConditions.push({ isOnline });
        }

        if (availableOnly) {
            andConditions.push({
                copies: {
                    some: {
                        isBorrowed: false,
                    },
                },
            });
        }

        if (andConditions.length > 0) {
            whereClause.AND = andConditions;
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
                bookName: true,
                author: true,
                createdAt: true,
                genre: true,
                almirahNumber: true,
                shelfNumber: true,
                image: true,
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
