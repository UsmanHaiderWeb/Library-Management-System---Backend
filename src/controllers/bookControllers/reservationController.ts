/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response } from 'express';
import { RequestWithUser } from '../../helpers/interfaces';
import { ReservationService } from '../../services/reservation.service';

export const joinWaitlistController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const { bookId } = req.params;

        if (!bookId) {
            res.status(400).json({ message: 'Book ID is required' });
            return;
        }

        const reservation = await ReservationService.joinWaitlist(user.id, bookId);

        res.status(201).json({
            message: `You've been added to the waitlist at position ${reservation.position}`,
            reservation,
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const cancelReservationController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const { bookId } = req.params;

        await ReservationService.cancelReservation(user.id, bookId);

        res.status(200).json({ message: 'Reservation cancelled' });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getMyReservationsController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const reservations = await ReservationService.getUserReservations(user.id);

        res.status(200).json({ reservations });
    } catch (error) {
        console.error('get reservations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getWaitlistPositionController = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as RequestWithUser).user;
        const { bookId } = req.params;

        const position = await ReservationService.getWaitlistPosition(user.id, bookId);

        res.status(200).json({ position });
    } catch (error) {
        console.error('get waitlist position error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
