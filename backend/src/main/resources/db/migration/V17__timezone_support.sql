-- V17__timezone_support.sql
-- Migration: Add timezone support to users and bookings
-- Date: 2026-08-10
-- Purpose: Fix critical timezone handling issues in booking system

-- ============================================================================
-- MIGRATION DECISIONS (Data Conversion Strategy)
-- ============================================================================
-- 1. Existing availability data:
--    - Current: LocalTime with no timezone context
--    - Decision: No change needed - LocalTime is correct for recurring availability
--    - Interpretation: Times will be interpreted in expert's timezone going forward
--
-- 2. Existing booking data:
--    - Current: TIMESTAMP (no timezone) - ambiguous representation
--    - Decision: Interpret existing timestamps as UTC
--    - Rationale: Most conservative approach - preserves exact values
--    - Impact: If existing bookings were meant to be in different timezone,
--              they will shift slightly. Since this is development data, acceptable.
--
-- 3. Existing users:
--    - Decision: Default all users to 'UTC' timezone
--    - Rationale: Safest default - users can update in profile
--    - Impact: Experts must configure their timezone after migration
--
-- 4. Google Calendar connections:
--    - Decision: No migration needed - connections remain valid
--    - Note: New bookings will use expert's timezone (not server timezone)
-- ============================================================================

-- Step 1: Add timezone to users table
-- All users default to UTC until they configure their actual timezone
ALTER TABLE users 
    ADD COLUMN timezone VARCHAR(64) NOT NULL DEFAULT 'UTC';

COMMENT ON COLUMN users.timezone IS 'IANA timezone ID (e.g., Africa/Cairo, Asia/Dubai, America/New_York). Determines how user availability and bookings are displayed.';

-- Step 2: Add timezone context columns to bookings
-- These preserve timezone information at booking time
ALTER TABLE bookings 
    ADD COLUMN expert_timezone VARCHAR(64),
    ADD COLUMN client_timezone VARCHAR(64),
    ADD COLUMN meeting_timezone VARCHAR(64);

COMMENT ON COLUMN bookings.expert_timezone IS 'Expert/trainer timezone at booking time (IANA ID)';
COMMENT ON COLUMN bookings.client_timezone IS 'Client timezone at booking time (IANA ID)';
COMMENT ON COLUMN bookings.meeting_timezone IS 'Agreed meeting timezone, typically matches expert timezone';

-- Step 3: Convert booking times to TIMESTAMPTZ
-- This interprets existing TIMESTAMP values as UTC and converts to timezone-aware type
-- Example: '2026-08-15 10:00:00' → '2026-08-15 10:00:00+00' (UTC instant)
ALTER TABLE bookings 
    ALTER COLUMN start_time TYPE TIMESTAMPTZ USING start_time AT TIME ZONE 'UTC',
    ALTER COLUMN end_time TYPE TIMESTAMPTZ USING end_time AT TIME ZONE 'UTC';

-- Step 4: Backfill timezone fields for existing bookings
-- This populates timezone context for any existing bookings using:
-- - Expert timezone from trainer's profile
-- - Client timezone from client's profile
-- - Meeting timezone defaults to expert timezone
UPDATE bookings b
SET 
    expert_timezone = COALESCE(
        (SELECT u.timezone FROM users u WHERE u.id = b.trainer_id),
        'UTC'
    ),
    client_timezone = COALESCE(
        (SELECT u.timezone FROM users u WHERE u.id = b.client_id),
        'UTC'
    ),
    meeting_timezone = COALESCE(
        (SELECT u.timezone FROM users u WHERE u.id = b.trainer_id),
        'UTC'
    )
WHERE expert_timezone IS NULL;

-- Step 5: Add indexes for performance
-- Timezone-aware queries will benefit from these indexes
CREATE INDEX idx_bookings_expert_timezone ON bookings(expert_timezone);
CREATE INDEX idx_users_timezone ON users(timezone);

-- Note: idx_bookings_start_time already exists from V3__Create_bookings.sql

-- Step 6: Add check constraints for valid timezone format
-- This validates timezone IDs follow IANA format (e.g., "Africa/Cairo", not "PST")
ALTER TABLE users 
    ADD CONSTRAINT chk_users_timezone_format 
    CHECK (timezone ~ '^[A-Z][A-Za-z_/]+$');

ALTER TABLE bookings 
    ADD CONSTRAINT chk_bookings_timezone_format 
    CHECK (
        (expert_timezone IS NULL OR expert_timezone ~ '^[A-Z][A-Za-z_/]+$') AND
        (client_timezone IS NULL OR client_timezone ~ '^[A-Z][A-Za-z_/]+$') AND
        (meeting_timezone IS NULL OR meeting_timezone ~ '^[A-Z][A-Za-z_/]+$')
    );

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================
-- Check users have timezone:
--   SELECT id, email, timezone FROM users LIMIT 10;
--
-- Check bookings have TIMESTAMPTZ:
--   SELECT column_name, data_type FROM information_schema.columns 
--   WHERE table_name = 'bookings' AND column_name IN ('start_time', 'end_time');
--
-- Check existing bookings have timezone backfill:
--   SELECT id, expert_timezone, client_timezone, meeting_timezone 
--   FROM bookings WHERE expert_timezone IS NULL;
--
-- Verify timezone conversion example:
--   SELECT id, start_time, 
--          start_time AT TIME ZONE 'Africa/Cairo' as cairo_time,
--          start_time AT TIME ZONE 'Asia/Dubai' as dubai_time
--   FROM bookings LIMIT 1;
-- ============================================================================
