-- The Academy membership ships later — until then the site stays
-- waitlist-only. This flips the pre-purchase toggle off so the public
-- Academy section shows "Join the waitlist" instead of a buy button.
-- Re-enable any time from Admin → Settings ("Allow pre-purchasing"),
-- then use Admin → Whitelist → "Notify launch" to email the list.
UPDATE settings
SET setting_value = 'false', updated_at = CURRENT_TIMESTAMP
WHERE setting_key = 'ACADEMY_PRE_PURCHASE_ENABLED';
