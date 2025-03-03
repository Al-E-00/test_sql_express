import { Request, Response } from 'express';
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

    if (!rows || rows.length === 0) {
      console.log(`[info] No data in the bookings table`);
      res.status(404).json({
        status: 404,
        message: 'No data in the bookings table',
        data: [],
      });
      return;
    }

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

    const data: Booking[] = rows.map((row) => convertDbBooking(row));

    res.status(200).json({
      status: 200,
      message: `All data from bookings table retrieved`,
      data,
    });
  });
};

export { getAllBookings };
