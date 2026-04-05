/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import csv from 'csv-parser';
import { prisma } from '../helpers/prismaDb';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

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
                        const importedBooks = await prisma.$transaction(async (tx) => {
                            const books = [];
                            for (const row of results) {
                                const totalBooks = parseInt(row.totalBooks) || 1;

                                const createdBook = await tx.book.create({
                                    data: {
                                        bookNumber: row.bookNumber,
                                        bookName: row.bookName,
                                        summary: row.summary || '',
                                        author: row.author,
                                        genre: row.genre,
                                        image: '',
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
