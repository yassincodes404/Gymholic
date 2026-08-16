-- Product orders (courses, PDFs, physical goods later) with payment history
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    total NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    provider_name VARCHAR(32) NOT NULL DEFAULT 'mock',
    provider_ref VARCHAR(128),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) NOT NULL,
    product_type VARCHAR(16) NOT NULL DEFAULT 'BLUEPRINT',
    title VARCHAR(255) NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Configurable booking prices (USD); discovery call stays free (0)
INSERT INTO settings (setting_key, setting_value, description, updated_at) VALUES
('BOOKING_PRICE_STRATEGY_CALL', '125', 'Price in USD for the 45-minute strategy call', CURRENT_TIMESTAMP),
('BOOKING_PRICE_IN_PERSON', '275', 'Price in USD for the private in-person consultation', CURRENT_TIMESTAMP),
('BOOKING_CURRENCY', 'USD', 'Currency used for all booking charges', CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO NOTHING;
