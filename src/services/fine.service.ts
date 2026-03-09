import { prisma } from '../helpers/prismaDb';

export class FineService {
    private static DAILY_FINE_AMOUNT = 10; // e.g., 10 currency units per day

    /**
     * Calculate fine for a returned book
     */
    static calculateFine(dueDate: Date | null, returnDate: Date): number {
        if (!dueDate || returnDate <= dueDate) return 0;

        const diffInTime = returnDate.getTime() - dueDate.getTime();
        const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));

        return diffInDays * this.DAILY_FINE_AMOUNT;
    }

    /**
   * Apply fine to a user's account
   */
    static async applyFine(userId: string, amount: number, tx: any) {
        if (amount <= 0) return;

        await tx.user.update({
            where: { id: userId },
            data: {
                fineBalance: {
                    increment: amount,
                },
            },
        });
    }

    /**
     * Record a fine for a user (This would ideally be a separate Fine model, but using a log/comment for now if model missing)
     * Note: The current schema doesn't have a 'Fine' model. I should add it or use metadata. 
     * I'll assume I should add a Fine model to schema.prisma.
     */
}
