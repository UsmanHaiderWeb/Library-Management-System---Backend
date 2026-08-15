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
                slug: true,
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
     * Look up a book by slug or id.
     *
     * Accepts three things, in order: the current slug, a slug the book used to
     * have (returns `redirectTo` so the client can swap the URL for the current
     * one), or a raw id — ids stay supported because older links and the admin
     * portal still use them.
     */
    static async getBookDetails(identifier: string, collegeCode: string) {
        const bySlug = await prisma.book.findFirst({
            where: { slug: identifier, College: { code: collegeCode } },
            select: this.bookDetailSelect,
        });
        if (bySlug) return bySlug;

        const byId = await prisma.book.findFirst({
            where: { id: identifier, College: { code: collegeCode } },
            select: this.bookDetailSelect,
        });
        if (byId) {
            // Reached by id but the book has a slug — send the client to it
            return byId.slug ? { ...byId, redirectTo: byId.slug } : byId;
        }

        // Finally, a slug this book used before it was renamed
        const retired = await prisma.bookSlug.findFirst({
            where: { slug: identifier, book: { College: { code: collegeCode } } },
            select: { bookId: true },
        });
        if (!retired) return null;

        const current = await prisma.book.findFirst({
            where: { id: retired.bookId },
            select: this.bookDetailSelect,
        });
        return current ? { ...current, redirectTo: current.slug ?? current.id } : null;
    }

    /** Shared projection so every lookup path returns the same shape. */
    private static bookDetailSelect = {
                id: true,
                slug: true,
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
                createdAt: true,
                copies: {
                    select: {
                        id: true,
                        isBorrowed: true,
                    },
                },
                _count: {
                    select: {
                        copies: {
                            where: {
                                isBorrowed: false,
                            },
                        },
                    },
                },
    } as const;
}
