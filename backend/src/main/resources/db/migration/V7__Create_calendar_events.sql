-- V7__Create_calendar_events.sql
-- We are mostly storing calendar data in the `bookings` table directly.
-- If we need a dedicated table mapping bookings to external calendar event IDs:

CREATE TABLE calendar_events (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES bookings(id),
    provider_name VARCHAR(50) NOT NULL, -- e.g. 'GOOGLE'
    external_event_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_calendar_events_booking_id ON calendar_events(booking_id);
