import { z } from 'zod';
import { BookingStatus } from '../types/booking';

/** A UUID */
export const Id = z.string().uuid();

/** A UTC datetime string, formatted as YYYY-MM-DDThh:mm:ssZ */
const ISO8601DateTime = z
  .string()
  .refine((str) => !isNaN(Date.parse(str)), {
    message: 'Invalid date format',
  })
  .transform((str) => new Date(str));

// booking_status table schema
export const BookingStatusSchema = z.nativeEnum(BookingStatus);

// bookings table schema
export const BookingSchema = z.object({
  id: Id,
  createdAt: ISO8601DateTime,
  updatedAt: ISO8601DateTime,
  orgId: Id,
  status: BookingStatusSchema,
  contact: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  event: z.object({
    title: z.string().min(3),
    locationId: Id,
    start: ISO8601DateTime,
    end: ISO8601DateTime,
    details: z.string().max(500),
  }),
  requestNote: z.string().optional(),
});

// Schema for booking db input
export const BookingInputSchema = z.object({
  id: Id,
  org_id: Id,
  status_id: BookingStatusSchema,
  contact_name: z.string().min(2),
  contact_email: z.string().email(),
  event_title: z.string().min(3),
  event_location_id: Id,
  event_start: ISO8601DateTime,
  event_end: ISO8601DateTime,
  event_details: z.string().max(500),
  request_note: z.string().nullable(),
});

// schema for db output
export const BookingSqlSchema = BookingInputSchema.extend({
  created_at: ISO8601DateTime,
  updated_at: ISO8601DateTime,
});
