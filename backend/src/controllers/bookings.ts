import { Request, Response } from 'express';
import { convertDbBooking } from '../utils';
import { z } from 'zod';

import db from '../db';

import { Booking, BookingSql } from '../types/booking';
import { Id } from '../models/bookings';

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
  const { id } = req.params;

  const parseResult = Id.safeParse(id);

  if (!parseResult.success) {
    console.log(
      `[error] Failed to parse booking ID: ${id}, error: ${parseResult.error.message}`
    );
    res.status(400).json({
      status: 400,
      message: `Invalid booking ID format`,
      data: null,
    });
    return;
  }

  const getBookingSql = `SELECT * FROM bookings WHERE id = ?`;

  db.get(getBookingSql, [id], (err, row: BookingSql) => {
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
};

/* export interface BookingSql {
  id: Id;
  created_at: ISO8601DateTime;
  updated_at: ISO8601DateTime;
  org_id: Id;
  status_id: BookingStatus;
  contact_name: string;
  contact_email: string;
  event_title: string;
  event_location_id: Id;
  event_start: ISO8601DateTime;
  event_end: ISO8601DateTime;
  event_details: string;
  request_note: string | null;
} */
// POST booking
const addBooking = (req: Request, res: Response) => {
  const addBookingSql = `INSERT INTO bookings (
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
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const {
    org_id,
    contact_name,
    contact_email,
    event_title,
    event_location_id,
    event_start,
    event_end,
    event_details,
    request_note,
  } = req.body;
};

export { getAllBookings, getBooking };
