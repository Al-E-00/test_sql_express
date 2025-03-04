import express from 'express';
import {
  addBooking,
  approveBooking,
  deleteBooking,
  editBooking,
  getAllBookings,
  getBooking,
} from '../controllers/bookings';

// Create a new router to handle the bookings routes
const bookingRouter = express.Router();

bookingRouter.get('/', getAllBookings);
bookingRouter.get('/:id', getBooking);
bookingRouter.post('/', addBooking);
bookingRouter.delete('/:id', deleteBooking);
bookingRouter.patch('/:id', editBooking);
bookingRouter.post('/:id/approve', approveBooking);

export default bookingRouter;
