import { prisma } from './prismaDb';

const MAX_SLUG_LENGTH = 160;

/**
 * Turns a title into a URL-safe slug: "The Hitch-Hiker's Guide (2nd ed.)"
 * becomes "the-hitch-hikers-guide-2nd-ed".
 */
export const slugify = (input: string): string =>
    (input || '')
        .normalize('NFKD')
        // Strip accents so "Café" and "Cafe" produce the same slug
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/, '');

/**
 * Builds a slug that is free within the college, across both current slugs and
 * retired ones — reusing a retired slug would silently hijack old links that
 * point at a different book.
 *
 * `ignoreBookId` lets a book keep its own slug when its title is unchanged.
 */
export const generateUniqueSlug = async (
    title: string,
    collegeId: string | null | undefined,
    ignoreBookId?: string,
): Promise<string> => {
    const base = slugify(title) || 'book';

    for (let suffix = 0; suffix < 200; suffix++) {
        const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;

        const [takenByBook, takenByHistory] = await Promise.all([
            prisma.book.findFirst({
                where: {
                    slug: candidate,
                    collegeId: collegeId ?? null,
                    ...(ignoreBookId ? { NOT: { id: ignoreBookId } } : {}),
                },
                select: { id: true },
            }),
            prisma.bookSlug.findFirst({
                where: {
                    slug: candidate,
                    collegeId: collegeId ?? null,
                    ...(ignoreBookId ? { NOT: { bookId: ignoreBookId } } : {}),
                },
                select: { id: true },
            }),
        ]);

        if (!takenByBook && !takenByHistory) return candidate;
    }

    // Pathological case — fall back to something guaranteed free
    return `${base}-${Date.now().toString(36)}`;
};

/**
 * Records the slug a book is moving away from, so links using it still resolve.
 * Safe to call repeatedly; duplicates are ignored.
 */
export const retireSlug = async (slug: string, bookId: string, collegeId: string | null | undefined) => {
    if (!slug) return;
    try {
        await prisma.bookSlug.create({
            data: { slug, bookId, collegeId: collegeId ?? null },
        });
    } catch {
        // Unique violation: this slug is already recorded for this book
    }
};
