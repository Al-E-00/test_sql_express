import express from 'express';
import {
  addBooking,
  getAllBookings,
  getBooking,
} from '../controllers/bookings';

// Create a new router to handle the bookings routes
const bookingRouter = express.Router();

bookingRouter.get('/', getAllBookings);
bookingRouter.get('/:id', getBooking);
bookingRouter.post('/', addBooking);

export default bookingRouter;
