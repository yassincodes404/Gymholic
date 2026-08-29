-- Explicit service type per booking. Historically the service was detected
-- from the booking notes ("In-Person" / "Strategy" / else open session);
-- this column makes it first-class so the free 3-hour time session and any
-- future service can be validated, priced and reported without note parsing.
ALTER TABLE bookings ADD COLUMN service_type VARCHAR(32) NOT NULL DEFAULT 'OPEN_SESSION';

-- One-time backfill using the same matching rules the backend used at creation.
UPDATE bookings SET service_type = CASE
    WHEN notes LIKE '%In-Person%' THEN 'IN_PERSON'
    WHEN notes LIKE '%Strategy%' THEN 'STRATEGY_CALL'
    ELSE 'OPEN_SESSION'
END;

-- Admin switch for the free 3-hour time session (one per trainer per day).
INSERT INTO settings (setting_key, setting_value, description, updated_at)
SELECT 'FREE_SESSION_ENABLED', 'true', 'Whether the free 3-hour time session can be booked', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'FREE_SESSION_ENABLED');
