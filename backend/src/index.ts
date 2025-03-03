import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
//TODO: remove import
import db from './db';
import { BookingSql } from './types/booking';

const app = express();
dotenv.config();

// Setting up middlewares
app.use(bodyParser.json());

//TODO: remove, only to test db
app.get('/', (req: Request, res: Response) => {
  const sql = `SELECT * FROM bookings TABLE`;

  db.run(sql, [], (err: Error | null, rows: BookingSql[]) => {});
});

app.use('/', (req: Request, res: Response) => {
  res.status(500).json({ message: 'Server OK' });
});

const port = process.env.PORT || '3002';

//Setting up the listening port
app.listen(port, (err: Error | undefined) => {
  if (err) {
    console.log(`[error] Error while listening on port ${port}`);
    return; // Stop function execution
  }

  console.log(`[info] Server running on http://localhost:${port}`);
});
