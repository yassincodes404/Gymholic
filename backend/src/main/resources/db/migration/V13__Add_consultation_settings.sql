-- Insert consultation defaults
INSERT INTO settings (setting_key, setting_value, description, updated_at) VALUES 
('CONSULTATION_PRICE_AED', '500', 'Default price for consultation in AED', CURRENT_TIMESTAMP),
('CONSULTATION_DURATION_MINUTES', '45', 'Default duration for consultation in minutes', CURRENT_TIMESTAMP),
('CONSULTATION_BUFFER_MINUTES', '5', 'Buffer time between consultations in minutes', CURRENT_TIMESTAMP);
