-- Link whitelist signups to a registered user account (nullable)
ALTER TABLE whitelist_entries ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
