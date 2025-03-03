import { Request, Response } from 'express';
import { convertDbBooking } from '../utils';
import db from '../db';

import { Booking, BookingSql } from '../types/booking';

const getAllBookings = (req: Request, res: Response) => {
  const getAllSql = `SELECT * FROM bookings`;

  db.all(getAllSql, [], (err, rows: BookingSql[]) => {
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

export { getAllBookings };
