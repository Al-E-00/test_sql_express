import express from 'express';
import { getAllBookings } from '../models/bookings';

// Create a new router to handle the bookings routes
const bookingRouter = express.Router();

bookingRouter.get('/', getAllBookings);

export default bookingRouter;
