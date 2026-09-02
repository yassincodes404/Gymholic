-- Cross-Account Protection (RISC): Google sends security events (account
-- purged/disabled, sessions revoked) keyed by the Google account id ("sub"),
-- not by email. Store it on calendar connections so those events can be
-- mapped back to the connected expert. Nullable — existing rows backfill
-- the next time the expert reconnects their calendar.
ALTER TABLE google_connections
    ADD COLUMN google_id VARCHAR(64);

CREATE INDEX idx_google_connections_google_id ON google_connections (google_id);
