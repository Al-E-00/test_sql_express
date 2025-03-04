import { z } from 'zod';
import { Booking, BookingSql, InternalBookingSql } from '../types/booking';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import db from '../db';
import { Id, ISO8601DateTimeSchema } from '../models/bookings';
import { Response } from 'express';

// Get the internal private id for db operations
const getPrivateId = async (
  id: BookingSql['id']
): Promise<InternalBookingSql['private_id']> => {
  const getInternalIdSql = `SELECT private_id FROM bookings WHERE id = ?`;

  return new Promise((resolve, reject) => {
    try {
      const safeId = Id.parse(id);
      db.get(getInternalIdSql, [safeId], (err, row: InternalBookingSql) => {
        if (err) {
          console.log(`[error] Error while getting private_id, ${err.message}`);
          reject(new Error(`Error while getting private_id, ${err.message}`));
          return;
        }

        if (!row) {
          console.log(`[info] No booking id ${safeId} found`);
          reject(new Error(`No booking id ${safeId} found`));
          return;
        }

        resolve(row.private_id);
      });
    } catch (err) {
      // Handle zod errors
      if (err instanceof z.ZodError) {
        reject(
          new Error(
            `[error] Error while validating id: ${JSON.stringify(
              handleValidationError(err)
            )}`
          )
        );
        return;
      }

      reject(new Error(`[error] Generic error ${err}`));
    }
  });
};

// Convert from BookingSql type to the Booking type
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
  requestNote: row.request_note === null ? undefined : row.request_note,
});

// Utility function for handling zod validation errors
const handleValidationError = (error: z.ZodError) => {
  // User-friendly error structure
  return error.errors
    .reduce((acc, curr) => {
      const path = curr.path.join(',');
      return acc + `${path ? `${path}: ` : ''}${curr.message}, `;
    }, '')
    .slice(0, -2); // Remove the trailing comma and space
};

// Utility function to display data in an human readable way
const prettyFormatDate = (date: string) => {
  try {
    const parsedData = ISO8601DateTimeSchema.parse(date);
    const safeDate = new Date(parsedData);

    return safeDate.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (err) {
    console.log(`[error] Error while formatting the data: ${err}`);
    return null;
  }
};

// Send booking confirmation email with mailgun
const sendBookingConfirmationEmail = async (bookingData: Booking) => {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: process.env.MAILGUN_USERNAME || 'api',
    key: process.env.MAILGUN_API || 'API_KEY',
  });

  const mailgunDomain =
    process.env.MAILGUN_DOMAIN ||
    'sandbox3e3b7c05691c447685c33a057e28fff0.mailgun.org';

  try {
    const data = await mg.messages.create(mailgunDomain, {
      from: `Prospero Bookings <postmaster@${mailgunDomain}>`,
      to: [`${bookingData.contact.name} <${bookingData.contact.email}>`],
      subject: `Booking Confirmation - ${bookingData.event.title}`,
      text: `
        Dear ${bookingData.contact.name},

        Your room booking has been confirmed. Here are the details of your reservation:

        Event: ${bookingData.event.title}
        Date: ${prettyFormatDate(
          bookingData.event.start
        )} to ${prettyFormatDate(bookingData.event.end)}
        Details: ${bookingData.event.details}
        ${
          bookingData.requestNote
            ? `\nAdditional Notes: ${bookingData.requestNote}`
            : ''
        }

        If you need to make any changes to your booking or have any questions, please don't hesitate to contact us.

        Thank you for your booking!

        Best regards,
        Prospero`,
    });

    console.log(
      `[info] Mailgun email sent to ${
        bookingData.contact.email
      }, mailgun details: ${JSON.stringify(data)}`
    );
    return true; // Signal that the email has been correctly sent
  } catch (err) {
    console.log(`[error] Mailgun error: ${err}`);
    return false; // Signal that we have an error
  }
};

type handleDatabaseErrorProps = {
  res: Response;
  operation?: string;
  id?: string;
  statusCode?: number;
};

const handleDatabaseError =
  ({ res, operation, id, statusCode }: handleDatabaseErrorProps) =>
  (err: Error) => {
    const idMsg = id ? `${id}` : '';

    // If no operation is passed down, display only the err.message
    console.log(
      `[error] ${
        operation
          ? `Error while ${operation}${idMsg}, error message: \n ${err.message}`
          : err.message
      }`
    );
    res.status(statusCode ?? 500).json({
      status: statusCode ?? 500,
      message: `${
        operation ? `Error while ${operation}${idMsg}` : err.message
      }`,
      data: null,
    });
  };

export {
  convertDbBooking,
  handleValidationError,
  sendBookingConfirmationEmail,
  getPrivateId,
  prettyFormatDate,
  handleDatabaseError,
};
