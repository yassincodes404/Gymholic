-- Additional admin-managed settings (Admin → Settings), all wired to live behavior:
--  * Free open consultation availability (booking + pricing endpoint)
--  * Reminder emails (24h and 1h before a session)
--  * No-show reschedule link validity window
--  * Override address for admin notification emails
--  * Academy membership pre-purchase (price + availability)
INSERT INTO settings (setting_key, setting_value, description, updated_at) VALUES
('BOOKING_FREE_CONSULTATION_ENABLED', 'true', 'Offer the Free Open Consultation on the website', CURRENT_TIMESTAMP),
('REMINDER_24H_ENABLED', 'true', 'Send the 24-hour reminder email', CURRENT_TIMESTAMP),
('REMINDER_1H_ENABLED', 'true', 'Send the 1-hour reminder email', CURRENT_TIMESTAMP),
('RESCHEDULE_WINDOW_DAYS', '14', 'Days a no-show reschedule link stays valid', CURRENT_TIMESTAMP),
('ADMIN_NOTIFY_EMAIL', '', 'Optional override for admin notification emails (empty = admin account email)', CURRENT_TIMESTAMP),
('ACADEMY_MEMBERSHIP_PRICE', '29', 'Price in USD for the Academy membership pre-purchase', CURRENT_TIMESTAMP),
('ACADEMY_PRE_PURCHASE_ENABLED', 'true', 'Allow pre-purchasing the Academy membership before launch', CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO NOTHING;
