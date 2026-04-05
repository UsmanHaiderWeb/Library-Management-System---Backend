/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithAdmin } from '../../helpers/interfaces';
import { ImportService } from '../../services/import.service';
import logger from '../../helpers/logger';

/**
 * Bulk import books via CSV (Admin only)
 */
export const bulkImportBooksController = async (req: Request, res: Response) => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const file = (req as any).file;

        if (!file) {
            return res.status(400).json({ message: 'Please upload a CSV file' });
        }

        const result = await ImportService.importBooks(file.path, admin.collegeId);

        res.status(201).json({
            message: 'Books imported successfully',
            count: (result as any).length,
            books: result
        });
    } catch (error: any) {
        logger.error('bulk import books error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

/**
 * Bulk import users via CSV (Admin only)
 */
export const bulkImportUsersController = async (req: Request, res: Response) => {
    try {
        const admin = (req as RequestWithAdmin).admin;
        const file = (req as any).file;

        if (!file) {
            return res.status(400).json({ message: 'Please upload a CSV file' });
        }

        const result = await ImportService.importUsers(file.path, admin.collegeId);

        res.status(201).json({
            message: 'Users imported successfully',
            count: (result as any).length,
            users: result
        });
    } catch (error: any) {
        logger.error('bulk import users error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};
