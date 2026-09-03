-- Phone verification: SMS one-time codes (Brevo) + a phone_verified flag.
-- Mirrors email_verification_codes: only the code hash is stored; a code is
-- single-use, expires, and locks after repeated wrong attempts.

-- The verified status rides on the account and resets whenever the number changes.
ALTER TABLE users ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE phone_verification_codes (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone       VARCHAR(20) NOT NULL,            -- the PENDING number (E.164), applied only after confirm
    code_hash   VARCHAR(100) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempts    INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_phone_verification_codes_user ON phone_verification_codes (user_id);
