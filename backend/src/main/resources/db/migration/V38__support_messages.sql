-- Client support channel: contact-form submissions ("something happened")
-- persist here so a complaint can never be lost with an email bounce, and
-- the admin inbox (Admin → Support) can track which ones are handled.
CREATE TABLE support_messages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120),
    email VARCHAR(255) NOT NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'OTHER',
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_messages_status ON support_messages (status);
CREATE INDEX idx_support_messages_email ON support_messages (email);
