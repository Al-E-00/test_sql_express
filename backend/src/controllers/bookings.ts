import { Request, Response } from 'express';
import { convertDbBooking, handleValidationError } from '../utils';
import { v4 as uuidv4 } from 'uuid';

import db from '../db';

import { Booking, BookingSql, BookingStatus } from '../types/booking';
import { BookingInputSchema, Id } from '../models/bookings';
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
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  try {
    const id = uuidv4();
    const org_id = uuidv4();
    const event_location_id = uuidv4();

    const event_start = new Date(req.body.event_start).toISOString();
    const event_end = new Date(req.body.event_end).toISOString();

    const bookingData = {
      id,
      org_id,
      status_id: BookingStatus.PENDING,
      contact_name: req.body.contact_name,
      contact_email: req.body.contact_email,
      event_title: req.body.event_title,
      event_location_id,
      event_start,
      event_end,
      event_details: req.body.event_details,
      request_note: req.body.request_note,
    };

    const safeBookingData = BookingInputSchema.parse(bookingData);

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

  try {
    const { id } = req.params;
    const parsedId = Id.parse(id);

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

      res.status(200).json({
        status: 200,
        message: `Booking id ${id} deleted`,
        data: null,
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

export { getAllBookings, getBooking, addBooking, deleteBooking };
