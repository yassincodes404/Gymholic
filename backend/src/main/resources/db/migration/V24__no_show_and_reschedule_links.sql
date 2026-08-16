-- No-show handling & client self-reschedule links.
-- A no-show gets a one-time reschedule token the client can use from the
-- emailed link (/reschedule?token=...) without signing in.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_token VARCHAR(64);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS no_show_note TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS expert_attended BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_bookings_reschedule_token ON bookings(reschedule_token);
