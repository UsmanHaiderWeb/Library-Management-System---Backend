/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '../helpers/prismaDb';
import { getDateRangeQuery } from '../helpers/dateUtils';

export type BookSort = 'newest' | 'popular' | 'title';

export class BookService {
    /**
     * Ordering for a listing.
     *
     * Every option ends with `id` so the order is *total*. Without a
     * tie-break, rows that share a sort value have no defined order, and
     * LIMIT/OFFSET paging over them can repeat a book on one page and skip it
     * on the next — invisible with 20 books, very visible with 10,000.
     */
    private static orderFor(sort: BookSort) {
        switch (sort) {
            case 'popular':
                // Most requested first; a proxy for demand until borrow
                // history is rich enough to rank on.
                return [
                    { BorrowedRequests: { _count: 'desc' as const } },
                    { createdAt: 'desc' as const },
                    { id: 'asc' as const },
                ];
            case 'title':
                return [{ bookName: 'asc' as const }, { id: 'asc' as const }];
            case 'newest':
            default:
                return [{ createdAt: 'desc' as const }, { id: 'asc' as const }];
        }
    }

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
        sort?: BookSort;
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
            toDate,
            sort = 'newest'
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
            orderBy: this.orderFor(sort),
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

    /**
     * Books to suggest alongside the one being viewed.
     *
     * Content-based and deliberately simple: same author scores highest, then
     * shared genre, with available copies preferred. No model, no training —
     * with a few thousand books and sparse borrowing history this beats
     * anything learned, and it works on day one of an install when there is no
     * history at all.
     *
     * Ranking happens in SQL-sized chunks rather than one clever query so the
     * intent stays readable.
     */
    static async getRelatedBooks(bookId: string, collegeId: string | null | undefined, limit = 6) {
        const book = await prisma.book.findUnique({
            where: { id: bookId },
            select: { id: true, author: true, genre: true },
        });
        if (!book) return [];

        const genres = (book.genre || '')
            .split(',')
            .map((g) => g.trim())
            .filter(Boolean)
            .slice(0, 4);

        const listSelect = {
            id: true,
            slug: true,
            bookName: true,
            author: true,
            genre: true,
            image: true,
            bgColor: true,
        } as const;

        const base = { collegeId: collegeId ?? null, NOT: { id: bookId } };

        const [sameAuthor, sameGenre] = await Promise.all([
            prisma.book.findMany({
                where: { ...base, author: book.author },
                select: listSelect,
                orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                take: limit,
            }),
            genres.length
                ? prisma.book.findMany({
                    where: { ...base, OR: genres.map((g) => ({ genre: { contains: g } })) },
                    select: listSelect,
                    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
                    take: limit * 2,
                })
                : Promise.resolve([]),
        ]);

        // Same author first, then genre matches, de-duplicated
        const merged = [...sameAuthor, ...sameGenre];
        const seen = new Set<string>();
        const unique = merged.filter((b) => (seen.has(b.id) ? false : seen.add(b.id)));

        // Nothing closely related — pad with what other students borrow most,
        // which is a better guess than simply the newest arrivals.
        if (unique.length < limit) {
            const filler = await prisma.book.findMany({
                where: { ...base, NOT: { id: { in: [bookId, ...unique.map((b) => b.id)] } } },
                select: listSelect,
                orderBy: [
                    { BorrowedRequests: { _count: 'desc' } },
                    { createdAt: 'desc' },
                    { id: 'asc' },
                ],
                take: limit - unique.length,
            });
            unique.push(...filler);
        }

        return unique.slice(0, limit);
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
