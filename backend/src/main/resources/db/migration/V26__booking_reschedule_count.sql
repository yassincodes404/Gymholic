-- Track how often a session was moved (shown as a "Rescheduled" badge to admin).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count INT NOT NULL DEFAULT 0;
