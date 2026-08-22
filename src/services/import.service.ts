/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import csv from 'csv-parser';
import { prisma } from '../helpers/prismaDb';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { generateUniqueSlug } from '../helpers/slug';

export class ImportService {
    /**
     * Import books from CSV
     */
    static async importBooks(filePath: string, collegeId: string) {
        const results: any[] = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    try {
                        // Slugs are resolved before the transaction opens.
                        // generateUniqueSlug runs two queries per title, and a
                        // few hundred of those inside an interactive
                        // transaction would sail past Prisma's 5s timeout.
                        // `claimed` keeps two books in the same file from
                        // taking the same slug, which the database alone
                        // cannot prevent mid-transaction.
                        const claimed = new Set<string>();
                        const slugs: string[] = [];
                        for (const row of results) {
                            let slug = await generateUniqueSlug(row.bookName, collegeId);
                            if (claimed.has(slug)) {
                                let n = 2;
                                while (claimed.has(`${slug}-${n}`)) n++;
                                slug = `${slug}-${n}`;
                            }
                            claimed.add(slug);
                            slugs.push(slug);
                        }

                        const importedBooks = await prisma.$transaction(async (tx) => {
                            const books = [];
                            for (const [index, row] of results.entries()) {
                                const totalBooks = parseInt(row.totalBooks) || 1;

                                const createdBook = await tx.book.create({
                                    data: {
                                        bookNumber: row.bookNumber,
                                        bookName: row.bookName,
                                        summary: row.summary || '',
                                        author: row.author,
                                        genre: row.genre,
                                        // The CSV template has always
                                        // documented an image column; it was
                                        // read and then thrown away, so every
                                        // imported book had a blank cover.
                                        image: row.image || '',
                                        slug: slugs[index],
                                        totalBooks: totalBooks,
                                        almirahNumber: parseInt(row.almirahNumber) || 0,
                                        shelfNumber: parseInt(row.shelfNumber) || 0,
                                        isOnline: row.isOnline === 'true',
                                        onlineFileUrl: row.onlineFileUrl || null,
                                        bgColor: row.bgColor || '#ffffff',
                                        collegeId: collegeId,
                                        copies: {
                                            create: Array.from({ length: totalBooks }).map(() => ({
                                                isBorrowed: false,
                                            }))
                                        }
                                    }
                                });
                                books.push(createdBook);
                            }
                            return books;
                        });

                        // Clean up file
                        fs.unlinkSync(filePath);
                        resolve(importedBooks);
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error) => reject(error));
        });
    }

    /**
     * Import users from CSV
     */
    static async importUsers(filePath: string, collegeId: string) {
        const results: any[] = [];

        return new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    try {
                        const importedUsers = await prisma.$transaction(async (tx) => {
                            const users = [];
                            for (const row of results) {
                                // Default password if not provided is studentId
                                const rawPassword = row.password || row.studentId;
                                const hashedPassword = await bcrypt.hash(rawPassword, 10);

                                const createdUser = await tx.user.create({
                                    data: {
                                        name: row.name,
                                        studentId: row.studentId,
                                        email: row.email,
                                        password: hashedPassword,
                                        phoneNumber: row.phoneNumber || null,
                                        batchYear: parseInt(row.batchYear) || null,
                                        role: (row.role as UserRole) || 'STUDENT',
                                        isEmailVerified: true, // Bulk imported users are usually pre-verified
                                        isVerifiedByAdmin: true,
                                        collegeId: collegeId,
                                    }
                                });
                                users.push({ id: createdUser.id, email: createdUser.email });
                            }
                            return users;
                        });

                        // Clean up file
                        fs.unlinkSync(filePath);
                        resolve(importedUsers);
                    } catch (error) {
                        reject(error);
                    }
                })
                .on('error', (error) => reject(error));
        });
    }
}
