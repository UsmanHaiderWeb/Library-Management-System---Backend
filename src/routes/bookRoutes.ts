/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import { studentAuthMiddleware } from '../middlewares/studentAuthMiddleware';
import { getUserDetailsController } from '../controllers/userControllers/getUserDetailsController';

export const bookRouter = express.Router();

// Auth routes
bookRouter.post('/create', studentAuthMiddleware, getUserDetailsController);