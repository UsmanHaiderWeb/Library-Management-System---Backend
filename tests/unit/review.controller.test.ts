import { Request, Response } from 'express';
import {
  addReviewController,
  getMyReviewsController,
  deleteReviewController,
  getBookReviewsController,
} from '../../src/controllers/studentControllers/reviewController';
import { prisma } from '../../src/helpers/prismaDb';

jest.mock('../../src/helpers/prismaDb', () => ({
  prisma: {
    review: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../../src/helpers/logger', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

function mockReqRes(overrides: {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  user?: Record<string, unknown> | null;
}) {
  const req = {
    body: overrides.body || {},
    params: overrides.params || {},
    user: overrides.user !== undefined ? overrides.user : { id: 'user-1', isEmailVerified: true },
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return { req, res };
}

describe('Review Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addReviewController', () => {
    it('should create a new review when none exists', async () => {
      const newReview = { id: 'rev-1', userId: 'user-1', bookId: 'book-1', rating: 4, comment: 'Great' };
      (prisma.review.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.review.create as jest.Mock).mockResolvedValue(newReview);

      const { req, res } = mockReqRes({
        body: { bookId: 'book-1', rating: 4, comment: 'Great' },
      });

      await addReviewController(req, res);

      expect(prisma.review.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', bookId: 'book-1', rating: 4, comment: 'Great' },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Review added successfully', review: newReview });
    });

    it('should update an existing review', async () => {
      const existing = { id: 'rev-1', userId: 'user-1', bookId: 'book-1', rating: 3, comment: 'OK' };
      const updated = { ...existing, rating: 5, comment: 'Excellent' };
      (prisma.review.findFirst as jest.Mock).mockResolvedValue(existing);
      (prisma.review.update as jest.Mock).mockResolvedValue(updated);

      const { req, res } = mockReqRes({
        body: { bookId: 'book-1', rating: 5, comment: 'Excellent' },
      });

      await addReviewController(req, res);

      expect(prisma.review.update).toHaveBeenCalledWith({
        where: { id: 'rev-1' },
        data: { rating: 5, comment: 'Excellent' },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Review updated successfully', review: updated });
    });

    it('should return 400 if required fields are missing', async () => {
      const { req, res } = mockReqRes({
        body: { bookId: 'book-1' }, // missing rating
      });

      await addReviewController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'User ID, Book ID, and Rating are required' });
    });

    it('should return 403 if email is not verified', async () => {
      const { req, res } = mockReqRes({
        body: { bookId: 'book-1', rating: 4 },
        user: { id: 'user-1', isEmailVerified: false },
      });

      await addReviewController(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if rating is out of range', async () => {
      const { req, res } = mockReqRes({
        body: { bookId: 'book-1', rating: 6 },
      });

      await addReviewController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Rating must be between 1 and 5' });
    });
  });

  describe('getMyReviewsController', () => {
    it('should return the user reviews', async () => {
      const reviews = [
        { id: 'rev-1', rating: 4, book: { id: 'b1', bookName: 'Book 1' } },
        { id: 'rev-2', rating: 5, book: { id: 'b2', bookName: 'Book 2' } },
      ];
      (prisma.review.findMany as jest.Mock).mockResolvedValue(reviews);

      const { req, res } = mockReqRes({});

      await getMyReviewsController(req, res);

      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ reviews, totalReviews: 2 });
    });

    it('should return 401 if user is not authenticated', async () => {
      const { req, res } = mockReqRes({ user: null });

      await getMyReviewsController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('deleteReviewController', () => {
    it('should delete the user own review', async () => {
      const review = { id: 'rev-1', userId: 'user-1' };
      (prisma.review.findFirst as jest.Mock).mockResolvedValue(review);
      (prisma.review.delete as jest.Mock).mockResolvedValue(review);

      const { req, res } = mockReqRes({ params: { reviewId: 'rev-1' } });

      await deleteReviewController(req, res);

      expect(prisma.review.findFirst).toHaveBeenCalledWith({
        where: { id: 'rev-1', userId: 'user-1' },
      });
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: 'rev-1' } });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if review does not belong to user', async () => {
      (prisma.review.findFirst as jest.Mock).mockResolvedValue(null);

      const { req, res } = mockReqRes({ params: { reviewId: 'rev-other' } });

      await deleteReviewController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Review not found or not yours' });
      expect(prisma.review.delete).not.toHaveBeenCalled();
    });

    it('should return 401 if user is not authenticated', async () => {
      const { req, res } = mockReqRes({ user: null, params: { reviewId: 'rev-1' } });

      await deleteReviewController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getBookReviewsController', () => {
    it('should return reviews and average rating for a book', async () => {
      const reviews = [
        { id: 'r1', rating: 4, user: { id: 'u1', name: 'Alice' } },
        { id: 'r2', rating: 2, user: { id: 'u2', name: 'Bob' } },
      ];
      (prisma.review.findMany as jest.Mock).mockResolvedValue(reviews);

      const req = { params: { bookId: 'book-1' } } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await getBookReviewsController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        reviews,
        totalReviews: 2,
        averageRating: 3,
      });
    });

    it('should return averageRating 0 when no reviews exist', async () => {
      (prisma.review.findMany as jest.Mock).mockResolvedValue([]);

      const req = { params: { bookId: 'book-1' } } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

      await getBookReviewsController(req, res);

      expect(res.json).toHaveBeenCalledWith({
        reviews: [],
        totalReviews: 0,
        averageRating: 0,
      });
    });
  });
});
