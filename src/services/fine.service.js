"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FineService = void 0;
class FineService {
    /**
     * Calculate fine for a returned book
     */
    static calculateFine(dueDate, returnDate) {
        if (!dueDate || returnDate <= dueDate)
            return 0;
        const diffInTime = returnDate.getTime() - dueDate.getTime();
        const diffInDays = Math.ceil(diffInTime / (1000 * 3600 * 24));
        return diffInDays * this.DAILY_FINE_AMOUNT;
    }
    /**
   * Apply fine to a user's account
   */
    static applyFine(userId, amount, tx) {
        return __awaiter(this, void 0, void 0, function* () {
            if (amount <= 0)
                return;
            yield tx.user.update({
                where: { id: userId },
                data: {
                    fineBalance: {
                        increment: amount,
                    },
                },
            });
        });
    }
}
exports.FineService = FineService;
FineService.DAILY_FINE_AMOUNT = 10; // e.g., 10 currency units per day
