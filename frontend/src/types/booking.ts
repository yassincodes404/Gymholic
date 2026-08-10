/**
 * TypeScript types for the booking system with timezone support.
 * 
 * These types match the backend DTOs exactly.
 */

/**
 * Booking status values (matches backend enum).
 */
export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

/**
 * Available consultation slot with full timezone context.
 * Returned by GET /api/availability/trainer/:id/slots
 */
export interface AvailableSlot {
  /** UTC instant (ISO 8601): "2026-08-15T08:00:00Z" */
  startTime: string;
  /** UTC instant (ISO 8601): "2026-08-15T08:45:00Z" */
  endTime: string;
  /** Time in client's timezone: "12:00" */
  displayTime: string;
  /** Time in expert's timezone: "10:00" */
  expertDisplayTime: string;
  /** Expert's IANA timezone: "Africa/Cairo" */
  expertTimezone: string;
  /** Client's IANA timezone: "Asia/Dubai" */
  clientTimezone: string;
}

/**
 * Request to create a new booking.
 * POST /api/bookings
 */
export interface CreateBookingRequest {
  trainerId: number;
  /** UTC instant (ISO 8601): "2026-08-15T08:00:00Z" */
  startTime: string;
  /** UTC instant (ISO 8601): "2026-08-15T08:45:00Z" */
  endTime: string;
  /** Client's IANA timezone: "Asia/Dubai" */
  clientTimezone: string;
  assessmentId?: string;
  notes?: string;
}

/**
 * Booking response DTO.
 * Returned by POST /api/bookings and GET /api/bookings/:id
 */
export interface Booking {
  id: number;
  clientId: number;
  clientName: string;
  trainerId: number;
  trainerName: string;
  /** UTC instant (ISO 8601): "2026-08-15T08:00:00Z" */
  startTime: string;
  /** UTC instant (ISO 8601): "2026-08-15T08:45:00Z" */
  endTime: string;
  /** Expert's timezone: "Africa/Cairo" */
  expertTimezone: string;
  /** Client's timezone: "Asia/Dubai" */
  clientTimezone: string;
  /** Meeting timezone (typically matches expert): "Africa/Cairo" */
  meetingTimezone: string;
  status: BookingStatus;
  assessmentId?: string;
  notes?: string;
  meetLink?: string;
  externalEventId?: string;
  createdAt: string;
}

/**
 * Request to reschedule an existing booking.
 * PUT /api/bookings/:id/reschedule
 */
export interface RescheduleBookingRequest {
  /** New start time as UTC instant */
  newStartTime: string;
  /** New end time as UTC instant */
  newEndTime: string;
}

/**
 * API response wrapper.
 * All API endpoints return this structure.
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}
