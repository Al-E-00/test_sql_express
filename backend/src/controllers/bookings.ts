import { Request, Response } from 'express';
import {
  convertDbBooking,
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
} from '../models/bookings';
import { z } from 'zod';

// GET bookings
const getAllBookings = (req: Request, res: Response) => {
  const getAllBookingSql = `SELECT * FROM bookings`;

  db.all(getAllBookingSql, [], (err, rows: BookingSql[]) => {
    if (err) {
      console.log(
        `[error] Error while getting all the bookings: ${err.message}`
      );
      res.status(500).json({
        status: 500,
        message: 'Error while getting all the bookings from the database',
        data: [],
      });
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
  });
};

// GET booking
const getBooking = (req: Request, res: Response) => {
  const getBookingSql = `SELECT * FROM bookings WHERE id = ?`;
  const { id } = req.params;

  try {
    const parsedId = Id.parse(id);

    db.get(getBookingSql, [parsedId], (err, row: BookingSql) => {
      if (err) {
        console.log(
          `[error] Error while getting the booking with id: ${id}, error message: ${err.message}`
        );
        res.status(500).json({
          status: 500,
          message: `Error while getting booking id: ${id}`,
          data: [],
        });
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
      console.log(
        `[error] Error while validating id: ${JSON.stringify(
          handleValidationError(err)
        )}`
      );

      res.status(400).json({
        status: 400,
        message: `Error while validating id: ${JSON.stringify(
          handleValidationError(err)
        )}`,
        data: null,
      });
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
        console.log(`[error] Error while adding a new booking: ${err.message}`);
        res.status(500).json({
          status: 500,
          message: `Error while adding a new booking`,
          data: null,
        });
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
      console.log(
        `[error] Validation error: ${JSON.stringify(
          handleValidationError(err)
        )}`
      );
      res.status(400).json({
        status: 400,
        message: `Validation error: ${JSON.stringify(
          handleValidationError(err)
        )}`,
        data: null,
      });
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
const deleteBooking = (req: Request, res: Response) => {
  const deleteSql = `DELETE FROM bookings WHERE id = ?`;
  const getBookingSql = `SELECT * FROM bookings WHERE id = ?`;

  try {
    const { id } = req.params;
    const parsedId = Id.parse(id);

    // Get the booking data to display
    db.get(getBookingSql, [parsedId], (err, row: BookingSql) => {
      if (err) {
        console.log(
          `[error] Error while getting the booking id: ${id}, error: ${err.message}`
        );
        res.status(500).json({
          status: 500,
          message: `Error while getting booking id ${id}`,
          data: null,
        });
        return;
      }

      db.run(deleteSql, [parsedId], function (err) {
        if (err) {
          console.log(`[error] Error while deleting the booking id ${id}`);
          res.status(500).json({
            status: 500,
            message: `Error while deleting booking id ${id}`,
            data: null,
          });
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
      console.log(
        `[error] Error while validating id for booking delete: ${JSON.stringify(
          handleValidationError(err)
        )}`
      );

      res.status(400).json({
        status: 400,
        message: `Error while validating id for booking delete: ${JSON.stringify(
          handleValidationError(err)
        )}`,
        data: null,
      });
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
const editBooking = (req: Request, res: Response) => {
  const getBookingSql = `SELECT * FROM bookings WHERE id = ?`;
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
    WHERE id = ?`;

  const { id } = req.params;

  try {
    const parsedId = Id.parse(id);

    db.get(getBookingSql, [parsedId], (err, row: BookingSql) => {
      if (err) {
        console.log(
          `[error] Error while getting the booking with id: ${id}, error message: ${err.message}`
        );
        res.status(500).json({
          status: 500,
          message: `Error while getting booking id: ${id}`,
          data: [],
        });
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
            safeData.id,
          ],
          function (err) {
            if (err) {
              console.log(
                `[error] Error while editing booking id${id}: ${err.message}`
              );
              res.status(500).json({
                status: 500,
                message: `Error while editing booking id ${id}`,
                data: null,
              });
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
          console.log(
            `[error] Error while validating booking data: ${JSON.stringify(
              handleValidationError(err)
            )}`
          );

          res.status(400).json({
            status: 400,
            message: `Error while validating booking data: ${JSON.stringify(
              handleValidationError(err)
            )}`,
            data: null,
          });
          return;
        }
      }
    });
  } catch (err) {
    // Handle zod errors
    if (err instanceof z.ZodError) {
      console.log(
        `[error] Error while validating id: ${JSON.stringify(
          handleValidationError(err)
        )}`
      );

      res.status(400).json({
        status: 400,
        message: `Error while validating id: ${JSON.stringify(
          handleValidationError(err)
        )}`,
        data: null,
      });
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
// TODO: update approved state
const approveBooking = (req: Request, res: Response) => {
  const getBookingSql = `SELECT * FROM bookings WHERE id = ?`;
  const updateBookingStatusSql = `UPDATE bookings SET
    status_id = ?,
    updated_at = ?
  WHERE id = ?`;

  try {
    const { id } = req.params;
    const safeId = Id.parse(id);
    const safeUpdatedDate = ISO8601DateTimeSchema.parse(
      new Date().toISOString()
    );
    const safeBookingStatus = BookingStatusSchema.parse(BookingStatus.APPROVED);

    db.get(getBookingSql, [safeId], (err, row: BookingSql) => {
      if (err) {
        console.log(
          `[error] Error while getting the booking id ${id}, ${err.message}`
        );
        res.status(500).json({
          status: 500,
          message: `Error while getting the booking id ${id}`,
          data: null,
        });
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
        [safeBookingStatus, safeUpdatedDate, safeId],
        async function (err) {
          if (err) {
            console.log(
              `[error] Error while updating the status_id of the booking id ${safeId}, ${err.message}`
            );
            res.status(500).json({
              status: 500,
              message: `Error while updating the status of the booking id ${safeId}`,
              data: null,
            });
            return;
          }

          if (this.changes === 0) {
            console.log(`[info] No booking id ${safeId} found`);
            res.status(404).json({
              status: 404,
              message: `No booking id ${safeId} found`,
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
      console.log(
        `[error] Validation error: ${JSON.stringify(
          handleValidationError(err)
        )}`
      );
      res.status(400).json({
        status: 400,
        message: `Validation error: ${JSON.stringify(
          handleValidationError(err)
        )}`,
        data: null,
      });
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
