-- The third consultation type is a PAID open-time online session (it was
-- briefly launched as a free call due to a naming mix-up). It gets its own
-- admin-managed price like the other services; the free-tier toggle dies.
INSERT INTO settings (setting_key, setting_value)
SELECT 'BOOKING_PRICE_OPEN_SESSION', '150'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'BOOKING_PRICE_OPEN_SESSION');

DELETE FROM settings WHERE setting_key = 'BOOKING_FREE_CONSULTATION_ENABLED';
