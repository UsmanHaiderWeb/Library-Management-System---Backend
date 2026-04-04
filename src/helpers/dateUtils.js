"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateRangeQuery = void 0;
/**
 * Utility to generate a professional Prisma date range query.
 * Ensures that the 'toDate' covers the entire day up to the last millisecond.
 */
const getDateRangeQuery = (fromDate, toDate) => {
    if (!fromDate && !toDate)
        return undefined;
    const query = {};
    if (fromDate) {
        const start = new Date(fromDate);
        if (!isNaN(start.getTime())) {
            // Set to start of day if not already
            start.setHours(0, 0, 0, 0);
            query.gte = start;
        }
    }
    if (toDate) {
        const end = new Date(toDate);
        if (!isNaN(end.getTime())) {
            // Set to end of day (23:59:59.999) to make the range inclusive
            end.setHours(23, 59, 59, 999);
            query.lte = end;
        }
    }
    return Object.keys(query).length > 0 ? query : undefined;
};
exports.getDateRangeQuery = getDateRangeQuery;
