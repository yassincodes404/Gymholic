-- The Free Time Session (3 hours, one per trainer per day) becomes a PAID
-- service with its own admin-managed price (default $300) instead of the
-- price-0 auto-confirmed promo. Checkout resolves the amount server-side
-- from this key, exactly like the other services.
INSERT INTO settings (setting_key, setting_value)
SELECT 'BOOKING_PRICE_FREE_SESSION', '300'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE setting_key = 'BOOKING_PRICE_FREE_SESSION');
