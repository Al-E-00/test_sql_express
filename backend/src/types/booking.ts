import { z } from 'zod';
import { BookingSchema, BookingSqlSchema } from '../models/bookings';

export type Booking = z.infer<typeof BookingSchema>;

/* Flattened interface for sqlite DB types */
export type BookingSql = z.infer<typeof BookingSqlSchema>;

export enum BookingStatus {
  PENDING = 0,
  APPROVED = 1,
  DENIED = 2,
  CANCELLED = 3,
}
