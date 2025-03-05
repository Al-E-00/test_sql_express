import { Request, Response } from 'express';
import {
  convertDbBooking,
  getPrivateId,
  handleDatabaseError,
  handleValidationError,
  sendBookingConfirmationEmail,
} from '../utils';
import { v4 as uuidv4 } from 'uuid';

import db from '../db';

import { Booking, BookingSql, BookingStatus } from '../types/booking';
import {
  BookingSqlSchema,
  BookingStatusSchema,
  Id,
  ISO8601DateTimeSchema,
  PaginationSchema,
} from '../models/bookings';
import { z } from 'zod';

// GET bookings
const getAllBookings = (req: Request, res: Response) => {
  const getAllBookingSql = `SELECT * FROM bookings
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?`;

  try {
    const { offset, limit } = req.body;
    const parsedOffset = PaginationSchema.offset.parse(offset);
    const parsedLimit = PaginationSchema.limit.parse(limit);

    db.all(
      getAllBookingSql,
      [parsedLimit, parsedOffset],
      (err, rows: BookingSql[]) => {
        if (err) {
          handleDatabaseError({ res, operation: 'getting all the bookings' })(
            err
          );
          return;
        }

        // No data in the database
        if (!rows || rows.length === 0) {
          console.log(`[info] No data in the bookings table`);
          res.status(404).json({
            status: 404,
            message: 'No data in the bookings table',
            data: [],
          });
          return;
        }

        const data: Booking[] = rows.map((row) => convertDbBooking(row));

        res.status(200).json({
          status: 200,
          message: `All data from bookings table retrieved`,
          data,
        });
      }
    );
  } catch (err) {
    // Handle zod errors
    if (err instanceof z.ZodError) {
      handleDatabaseError({
        res,
        operation: `validating data, ${handleValidationError(err)}`,
        statusCode: 400,
      })(err);
      return;
    }

    if (err instanceof Error) {
      handleDatabaseError({ res })(err);
      return;
    }

    console.log(`[error] Database error: ${err}`);

    res.status(500).json({
      status: 500,
      message: `Database error: ${err}`,
      data: null,
    });
    return;
  }
};

// GET booking
const getBooking = async (req: Request, res: Response) => {
  const getBookingSql = `SELECT * FROM bookings WHERE private_id = ?`;
  const { id } = req.params;

  try {
    const parsedId = Id.parse(id);
    const privateId = await getPrivateId(parsedId);

    db.get(getBookingSql, [privateId], (err, row: BookingSql) => {
      if (err) {
        handleDatabaseError({
          res,
          operation: 'getting the booking with id:',
          id: parsedId,
        })(err);
        return;
      }

      if (!row) {
        console.log(`[info] The booking id: ${id} does not exist`);
        res.status(404).json({
          status: 404,
          message: `No data for the booking id: ${id}`,
          data: [],
        });
        return;
      }

      const data = convertDbBooking(row);

      res.status(200).json({
        status: 200,
        message: `Retrieved data for booking id ${id}`,
        data,
      });
    });
  } catch (err) {
    // Handle zod errors
    if (err instanceof z.ZodError) {
      handleDatabaseError({
        res,
        operation: `validating data, ${handleValidationError(err)}`,
        statusCode: 400,
      })(err);
      return;
    }

    if (err instanceof Error) {
      handleDatabaseError({ res })(err);
      return;
    }

    console.log(`[error] Database error: ${err}`);

    res.status(500).json({
      status: 500,
      message: `Database error: ${err}`,
      data: null,
    });
    return;
  }
};

// POST booking
const addBooking = (req: Request, res: Response) => {
  const addBookingSql = `INSERT INTO bookings (
    id,
    created_at,
    updated_at,
    org_id,
    status_id,
    contact_name,
    contact_email,
    event_title,
    event_location_id,
    event_start,
    event_end,
    event_details,
    request_note
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
    const bookingData = {
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      org_id: uuidv4(),
      status_id: BookingStatus.PENDING,
      contact_name: req.body.contact_name,
      contact_email: req.body.contact_email,
      event_title: req.body.event_title,
      event_location_id: uuidv4(),
      event_start: req.body.event_start,
      event_end: req.body.event_end,
      event_details: req.body.event_details,
      request_note: req.body.request_note,
    };

    const safeBookingData = BookingSqlSchema.parse(bookingData);

    db.run(addBookingSql, [...Object.values(safeBookingData)], (err) => {
      if (err) {
        handleDatabaseError({ res, operation: 'adding a new booking' })(err);
        return;
      }

      res.status(200).json({
        status: 200,
        message: `Added a new booking`,
        data: safeBookingData,
      });
    });
  } catch (err) {
    // Handle zod errors
    if (err instanceof z.ZodError) {
      handleDatabaseError({
        res,
        operation: `validating data, ${handleValidationError(err)}`,
        statusCode: 400,
      })(err);
      return;
    }

    console.log(`[error] Unexpected error: ${err}`);
    res.status(500).json({
      status: 500,
      message: `Unexpected error occurred`,
      data: null,
    });
  }
};

// DELETE booking
const deleteBooking = async (req: Request, res: Response) => {
  const deleteSql = `DELETE FROM bookings WHERE private_id = ?`;
  const getBookingSql = `SELECT * FROM bookings WHERE private_id = ?`;

  try {
    const { id } = req.params;
    const parsedId = Id.parse(id);
    const privateId = await getPrivateId(parsedId);

    // Get the booking data to display
    db.get(getBookingSql, [privateId], (err, row: BookingSql) => {
      if (err) {
        handleDatabaseError({
          res,
          operation: 'getting the booking with id:',
          id: parsedId,
        })(err);
        return;
      }

      db.run(deleteSql, [privateId], function (err) {
        if (err) {
          handleDatabaseError({
            res,
            operation: 'deleting the booking with id:',
            id: parsedId,
          })(err);
          return;
        }

        if (this.changes === 0) {
          console.log(`[info] No booking id ${id} found`);

          res.status(404).json({
            status: 404,
            message: `No booking id ${id} found`,
            data: null,
          });
          return;
        }

        const bookingData = convertDbBooking(row);
        res.status(200).json({
          status: 200,
          message: `Booking id ${id} deleted`,
          data: bookingData,
        });
      });
    });
  } catch (err) {
    // Handle zod errors
    if (err instanceof z.ZodError) {
      handleDatabaseError({
        res,
        operation: `validating data, ${handleValidationError(err)}`,
        statusCode: 400,
      })(err);
      return;
    }

    if (err instanceof Error) {
      handleDatabaseError({ res })(err);
      return;
    }

    console.log(`[error] Unexpected error: ${err}`);
    res.status(500).json({
      status: 500,
      message: `Unexpected error occurred`,
      data: null,
    });
  }
};

// PATCH booking
const editBooking = async (req: Request, res: Response) => {
  const getBookingSql = `SELECT * FROM bookings WHERE private_id = ?`;
  const editBookingSql = `UPDATE bookings SET
      updated_at = ?,
      status_id = ?,
      contact_name = ?,
      contact_email = ?,
      event_title = ?,
      event_start = ?,
      event_end = ?,
      event_details = ?,
      request_note = ?
    WHERE private_id = ?`;

  const { id } = req.params;

  try {
    const parsedId = Id.parse(id);
    const privateId = await getPrivateId(parsedId);

    db.get(getBookingSql, [privateId], (err, row: BookingSql) => {
      if (err) {
        handleDatabaseError({
          res,
          operation: 'getting the booking with id:',
          id: parsedId,
        })(err);
        return;
      }

      if (!row) {
        console.log(`[info] The booking id: ${id} does not exist`);
        res.status(404).json({
          status: 404,
          message: `No data for the booking id: ${id}`,
          data: [],
        });
        return;
      }

      //If no data has been changed
      if (
        Object.keys(req.body).length === 0 ||
        !Object.keys(req.body).some((key) =>
          [
            'status_id',
            'contact_name',
            'contact_email',
            'event_title',
            'event_start',
            'event_end',
            'event_details',
            'request_note',
          ].includes(key)
        )
      ) {
        console.log(`[info] No data to update for booking id ${id}`);
        res.status(400).json({
          status: 400,
          message: `No data to update for booking id ${id}`,
          data: null,
        });
        return;
      }

      const newData = {
        id: row.id,
        created_at: row.created_at,
        updated_at: new Date().toISOString(),
        org_id: row.org_id,
        status_id: req.body.status_id ?? row.status_id,
        contact_name: req.body.contact_name ?? row.contact_name,
        contact_email: req.body.contact_email ?? row.contact_email,
        event_title: req.body.event_title ?? row.event_title,
        event_location_id: row.event_location_id,
        event_start: req.body.event_start ?? row.event_start,
        event_end: req.body.event_end ?? row.event_end,
        event_details: req.body.event_details ?? row.event_details,
        request_note: req.body.request_note
          ? req.body.request_note === null
            ? undefined
            : req.body.request_note
          : row.request_note,
      };

      try {
        const safeData = BookingSqlSchema.parse(newData);
        const dbData = convertDbBooking(safeData);

        db.run(
          editBookingSql,
          [
            safeData.updated_at,
            safeData.status_id,
            safeData.contact_name,
            safeData.contact_email,
            safeData.event_title,
            safeData.event_start,
            safeData.event_end,
            safeData.event_details,
            safeData.request_note,
            privateId,
          ],
          function (err) {
            if (err) {
              handleDatabaseError({
                res,
                operation: 'editing the booking with id:',
                id: parsedId,
              })(err);
              return;
            }

            if (this.changes === 0) {
              console.log(`[info] No booking id ${id} found`);

              res.status(404).json({
                status: 404,
                message: `No booking id ${id} found`,
                data: null,
              });
              return;
            }

            res.status(200).json({
              status: 200,
              message: `Booking id: ${id} edited`,
              data: dbData,
            });
          }
        );
      } catch (err) {
        // Handle zod errors
        if (err instanceof z.ZodError) {
          handleDatabaseError({
            res,
            operation: `validating data, ${handleValidationError(err)}`,
            statusCode: 400,
          })(err);
          return;
        }

        console.log(`[error] Database error: ${err}`);
        res.status(500).json({
          status: 500,
          message: `Database error occurred`,
          data: null,
        });
        return;
      }
    });
  } catch (err) {
    // Handle zod errors
    if (err instanceof z.ZodError) {
      handleDatabaseError({
        res,
        operation: `validating data, ${handleValidationError(err)}`,
        statusCode: 400,
      })(err);
      return;
    }

    if (err instanceof Error) {
      handleDatabaseError({ res })(err);
      return;
    }

    console.log(`[error] Database error ${err}`);

    res.status(500).json({
      status: 500,
      message: `Database error `,
      data: null,
    });
    return;
  }
};

// APPROVE booking
const approveBooking = async (req: Request, res: Response) => {
  const getBookingSql = `SELECT * FROM bookings WHERE private_id = ?`;
  const updateBookingStatusSql = `UPDATE bookings SET
    status_id = ?,
    updated_at = ?
  WHERE private_id = ?`;

  try {
    const { id } = req.params;
    const parsedId = Id.parse(id);
    const privateId = await getPrivateId(parsedId);

    const safeUpdatedDate = ISO8601DateTimeSchema.parse(
      new Date().toISOString()
    );
    const safeBookingStatus = BookingStatusSchema.parse(BookingStatus.APPROVED);

    db.get(getBookingSql, [privateId], (err, row: BookingSql) => {
      if (err) {
        handleDatabaseError({
          res,
          operation: 'getting the booking with id:',
          id: parsedId,
        })(err);
        return;
      }

      // No booking found
      if (!row) {
        console.log(`[info] No booking id ${id} found`);
        res.status(500).json({
          status: 500,
          message: `No booking id ${id} found`,
          data: null,
        });
        return;
      }

      if (row.status_id === BookingStatus.APPROVED) {
        console.log(`[info] The booking id ${id} has already been approved`);
        res.status(400).json({
          status: 400,
          message: `The booking id ${id} has already been approved`,
          data: null,
        });
        return;
      }

      // Update status_id from PENDING to APPROVED
      db.run(
        updateBookingStatusSql,
        [safeBookingStatus, safeUpdatedDate, privateId],
        async function (err) {
          if (err) {
            handleDatabaseError({
              res,
              operation: 'updating the status_id of the booking id:',
              id: parsedId,
            })(err);
            return;
          }

          if (this.changes === 0) {
            console.log(`[info] No booking id ${parsedId} found`);
            res.status(404).json({
              status: 404,
              message: `No booking id ${parsedId} found`,
              data: null,
            });
            return;
          }

          const bookingData = convertDbBooking({
            ...row,
            updated_at: safeUpdatedDate,
            status_id: safeBookingStatus,
          });

          // Send email
          const emailSent = await sendBookingConfirmationEmail(bookingData);

          if (!emailSent) {
            res.status(500).json({
              status: 500,
              message: `Error while trying to send the email`,
              data: null,
            });

            return;
          }

          res.status(200).json({
            status: 200,
            message: `Email correctly sent to email address: ${bookingData.contact.email}`,
            data: bookingData,
          });
        }
      );
    });
  } catch (err) {
    // Handle zod errors
    if (err instanceof z.ZodError) {
      handleDatabaseError({
        res,
        operation: `validating data, ${handleValidationError(err)}`,
        statusCode: 400,
      })(err);
      return;
    }

    if (err instanceof Error) {
      handleDatabaseError({ res })(err);
      return;
    }

    console.log(`[error] Unexpected error: ${err}`);
    res.status(500).json({
      status: 500,
      message: `Unexpected error occurred`,
      data: null,
    });
  }
};

export {
  getAllBookings,
  getBooking,
  addBooking,
  deleteBooking,
  editBooking,
  approveBooking,
};
