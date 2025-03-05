import { Response } from 'express';
import { z } from 'zod';
import db from '../db';

import { Booking, BookingSql, InternalBookingSql } from '../types/booking';
import { Id, ISO8601DateTimeSchema } from '../models/bookings';

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

// Handles the backend errors
type handleErrorsProps = {
  res: Response;
  operation?: string;
  id?: string;
  statusCode?: number;
};

const handleErrors =
  ({ res, operation, id, statusCode }: handleErrorsProps) =>
  (err: Error | unknown) => {
    // Extract and normalize error message
    const getErrorMessage = () => {
      if (err instanceof z.ZodError) return handleValidationError(err);
      if (err instanceof Error) return err.message;
      return String(err);
    };

    const operationContext = operation
      ? `Error while ${operation}${id ? ` ${id}` : ''}`
      : '';
    const errorMessage = getErrorMessage();

    // Construct log message
    const logMessage = operationContext
      ? `${operationContext}${
          errorMessage ? `, error message: \n ${errorMessage}` : ''
        }`
      : errorMessage;

    // Log the error
    console.log(`[error] ${logMessage}`);

    // Send error response
    res.status(statusCode ?? 500).json({
      status: statusCode ?? 500,
      message: operationContext
        ? `${operationContext}${errorMessage ? `: ${errorMessage}` : ''}`
        : errorMessage,
      data: null,
    });
  };

export {
  convertDbBooking,
  handleValidationError,
  getPrivateId,
  prettyFormatDate,
  handleErrors,
};
