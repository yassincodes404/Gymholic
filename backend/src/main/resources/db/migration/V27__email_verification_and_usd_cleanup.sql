-- Email verification (OTP codes for login/signup confirmation) + USD cleanup.

-- 1) Existing accounts are grandfathered as verified so nobody is locked out
--    after the feature ships; only NEW registrations go through the code flow.
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET email_verified = TRUE;

-- 2) One-time email confirmation codes (6-digit). Codes are stored hashed.
CREATE TABLE email_verification_codes (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   VARCHAR(100) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempts    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_verification_codes_user ON email_verification_codes (user_id);

-- 3) USD everywhere: drop the dead AED setting, fix the cart default that
--    predated the currency switch, and normalize any stray BOOKING_CURRENCY.
DELETE FROM settings WHERE setting_key = 'CONSULTATION_PRICE_AED';
ALTER TABLE cart_items ALTER COLUMN currency SET DEFAULT 'USD';
UPDATE settings SET setting_value = 'USD' WHERE setting_key = 'BOOKING_CURRENCY' AND setting_value <> 'USD';
