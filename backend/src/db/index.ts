import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

// Get detailed logs
const sql3 = sqlite3.verbose();

// Create a new database
const dbPath = path.resolve(__dirname, process.env.DB_NAME || 'database.db');
const db = new sql3.Database(dbPath, (err) => {
  if (err) {
    console.log(`[error] impossible to create database`);
    return;
  }

  console.log(`[info] sqlite database created`);
});

// Promisify db.run for async/await usage
const dbRun = promisify(db.run.bind(db));

const createTables = async () => {
  try {
    // Create booking_status table
    await dbRun(`CREATE TABLE IF NOT EXISTS booking_status (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )`);
    console.log(`[info] booking_status table created`);

    // Create bookings table
    await dbRun(`CREATE TABLE IF NOT EXISTS bookings (
      private_id INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      org_id TEXT NOT NULL,
      status_id INTEGER NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      event_title TEXT NOT NULL,
      event_location_id TEXT NOT NULL,
      event_start TEXT NOT NULL,
      event_end TEXT NOT NULL,
      event_details TEXT NOT NULL,
      request_note TEXT,
      FOREIGN KEY (status_id)
        REFERENCES booking_status (id)
    )`);
    console.log(`[info] bookings table created`);

    // Populate booking_status table
    await dbRun(`
    INSERT OR IGNORE INTO booking_status (id, name) VALUES
      (0, 'PENDING'),
      (1, 'APPROVED'),
      (2, 'DENIED'),
      (3, 'CANCELLED')
    `);
    console.log(`[info] booking_status table populated`);
  } catch (err) {
    // It means that the error should respect this structure:
    /*
     * interface Error {
     *   name: string;
     *   message: string;
     *   stack?: string;
     * }
     */
    if (err instanceof Error) {
      console.log(`[error] Error during database setup: ${err.message}`);
    }

    console.log(`[error] Error during database setup: ${err}`);
  }
};

createTables();

export default db;
