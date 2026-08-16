-- Whitelist / waitlist signups (Academy, future features)
CREATE TABLE IF NOT EXISTS whitelist_entries (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    source VARCHAR(32) NOT NULL DEFAULT 'ACADEMY',
    notified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT uq_whitelist_email_source UNIQUE (email, source)
);
