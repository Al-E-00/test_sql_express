export interface Booking {
  id: Id;
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
  orgId: Id;
  status: BookingStatus;
  contact: {
    name: string;
    email: string;
  };
  event: {
    title: string;
    locationId: Id;
    start: ISO8601DateTime;
    end: ISO8601DateTime;
    details: string;
  };
  requestNote?: string;
}

/* Flattened interface for sqlite DB types */
export interface BookingSql {
  id: Id;
  createdAt: ISO8601DateTime;
  updatedAt: ISO8601DateTime;
  orgId: Id;
  status: BookingStatus;
  contact_name: string;
  contact_email: string;
  event_title: string;
  event_locationId: Id;
  event_start: ISO8601DateTime;
  event_end: ISO8601DateTime;
  event_details: string;
  requestNote?: string;
}

/** A UUID */
export type Id = string;

/** A UTC datetime string, formatted as YYYY-MM-DDThh:mm:ssZ */
type ISO8601DateTime = string;

enum BookingStatus {
  PENDING = 0,
  APPROVED = 1,
  DENIED = 2,
  CANCELLED = 3,
}
