import { z } from 'zod';
import { BookingStatus } from '../types/booking';

/** A UUID */
export const Id = z.string().uuid();

/** A UTC datetime string, formatted as YYYY-MM-DDThh:mm:ssZ */
export const ISO8601DateTimeSchema = z
  .string()
  .refine((str) => !isNaN(Date.parse(str)), {
    message: 'Invalid date format',
  })
  .transform((str) => new Date(str).toISOString().split('.')[0] + 'Z');

// booking_status table schema
export const BookingStatusSchema = z.nativeEnum(BookingStatus);

// bookings table schema
export const BookingSchema = z.object({
  id: Id,
  createdAt: ISO8601DateTimeSchema,
  updatedAt: ISO8601DateTimeSchema,
  orgId: Id,
  status: BookingStatusSchema,
  contact: z.object({
    name: z.string().min(2),
    email: z.string().email(),
  }),
  event: z.object({
    title: z.string().min(3),
    locationId: Id,
    start: ISO8601DateTimeSchema,
    end: ISO8601DateTimeSchema,
    details: z.string().max(500),
  }),
  requestNote: z.string().optional(),
});

// Schema for booking db input
export const BookingSqlSchema = z.object({
  id: Id,
  created_at: ISO8601DateTimeSchema,
  updated_at: ISO8601DateTimeSchema,
  org_id: Id,
  status_id: BookingStatusSchema,
  contact_name: z.string().min(2),
  contact_email: z.string().email(),
  event_title: z.string().min(3),
  event_location_id: Id,
  event_start: ISO8601DateTimeSchema,
  event_end: ISO8601DateTimeSchema,
  event_details: z.string().max(500),
  request_note: z.string().optional(),
});

export const InternalBookingSqlSchema = BookingSqlSchema.extend({
  private_id: z.number(),
});
