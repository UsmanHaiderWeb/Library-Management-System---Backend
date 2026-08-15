/**
 * Gives every existing book a URL slug.
 *
 * Run once after upgrading to the slug-based book URLs:
 *   cd Backend && node scripts/backfill-slugs.js
 *
 * Idempotent — books that already have a slug are left alone, so it is safe to
 * re-run. New books get their slug at creation time.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MAX_SLUG_LENGTH = 160;

const slugify = (input) =>
    (input || '')
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, MAX_SLUG_LENGTH)
        .replace(/-+$/, '');

(async () => {
    const books = await prisma.book.findMany({
        where: { slug: null },
        select: { id: true, bookName: true, collegeId: true },
        orderBy: { createdAt: 'asc' },
    });

    if (books.length === 0) {
        console.log('Nothing to do — every book already has a slug.');
        await prisma.$disconnect();
        return;
    }

    console.log(`Backfilling ${books.length} book(s)...\n`);
    let done = 0;

    for (const book of books) {
        const base = slugify(book.bookName) || 'book';
        let slug = base;

        // Walk suffixes until the slug is free within this college
        for (let n = 2; n < 200; n++) {
            const clash = await prisma.book.findFirst({
                where: { slug, collegeId: book.collegeId, NOT: { id: book.id } },
                select: { id: true },
            });
            if (!clash) break;
            slug = `${base}-${n}`;
        }

        await prisma.book.update({ where: { id: book.id }, data: { slug } });
        console.log(`  ${book.bookName.slice(0, 44).padEnd(46)} -> ${slug}`);
        done++;
    }

    console.log(`\nDone: ${done} book(s) now have slugs.`);
    await prisma.$disconnect();
})().catch(async (e) => {
    console.error('Backfill failed:', e.message);
    await prisma.$disconnect();
    process.exit(1);
});
