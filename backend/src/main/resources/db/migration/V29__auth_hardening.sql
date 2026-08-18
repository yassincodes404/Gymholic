-- Auth hardening: multi-purpose one-time codes + password reset tokens.

-- 1) The one-time 6-digit codes now carry a purpose so the same table can
--    back email verification, passwordless OTP login and email changes
--    without one flow consuming another flow's code. target_email holds the
--    pending new address during an email change.
ALTER TABLE email_verification_codes ADD COLUMN IF NOT EXISTS purpose VARCHAR(32) NOT NULL DEFAULT 'VERIFY';
ALTER TABLE email_verification_codes ADD COLUMN IF NOT EXISTS target_email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_purpose
    ON email_verification_codes (user_id, purpose);

-- 2) Password reset tokens (emailed as a link, stored hashed, single-use).
CREATE TABLE password_reset_tokens (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
