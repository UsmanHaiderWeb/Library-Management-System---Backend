import { prisma } from '../helpers/prismaDb';

export class DigitalLibraryService {
    /**
     * Check if a user can access a digital book
     */
    static async canAccess(userId: string, bookId: string, collegeId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isVerifiedByAdmin: true, isEmailVerified: true, collegeId: true }
        });

        if (!user || user.collegeId !== collegeId) {
            throw new Error('User not found or access denied');
        }

        if (!user.isVerifiedByAdmin || !user.isEmailVerified) {
            throw new Error('Your account must be verified by an admin to access the digital library.');
        }

        const book = await prisma.book.findFirst({
            where: { id: bookId, collegeId, isOnline: true },
            select: { onlineFileUrl: true }
        });

        if (!book) {
            throw new Error('This book is not available in the digital library or does not exist.');
        }

        return book.onlineFileUrl;
    }
}
