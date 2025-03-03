import { z } from 'zod';
import { Booking, BookingSql } from '../types/booking';

const convertDbBooking = (row: BookingSql): Booking => ({
  id: row.id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  orgId: row.org_id,
  status: row.status_id,
  contact: {
    name: row.contact_name,
    email: row.contact_email,
  },
  event: {
    title: row.event_title,
    locationId: row.event_location_id,
    start: row.event_start,
    end: row.event_end,
    details: row.event_details,
  },
  requestNote:
    row.request_note === null || row.request_note.length === 0
      ? undefined
      : row.request_note,
});

// Utility function for handling validation errors
const handleValidationError = (error: z.ZodError) => {
  // User-friendly error structure
  return error.errors.reduce((acc, curr) => {
    const path = curr.path.join(',');
    return {
      ...acc,
      [path]: curr.message,
    };
  }, {});
};

export { convertDbBooking, handleValidationError };
