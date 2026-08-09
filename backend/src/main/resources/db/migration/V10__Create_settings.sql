-- V10__Create_settings.sql

CREATE TABLE settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP
);

CREATE INDEX idx_settings_key ON settings(setting_key);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description, updated_at) VALUES 
('PLATFORM_FEE_PERCENTAGE', '5.0', 'Percentage fee taken by the platform per booking', CURRENT_TIMESTAMP),
('CANCELLATION_WINDOW_HOURS', '24', 'Hours before booking start time when cancellation is allowed without penalty', CURRENT_TIMESTAMP);
