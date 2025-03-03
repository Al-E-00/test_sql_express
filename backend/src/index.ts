import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import bookingRouter from './routes/bookings';

const app = express();
dotenv.config();

// Setting up middlewares
app.use(bodyParser.json());

// It will automatically apply the initial route as /api/bookings
app.use('/api/bookings', bookingRouter);

// Fallback for all the calls that don't respect a route
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
