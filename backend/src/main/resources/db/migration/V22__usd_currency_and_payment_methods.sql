-- All transactions are USD: normalize any legacy AED rows.
UPDATE cart_items SET currency = 'USD' WHERE currency = 'AED';
UPDATE orders SET currency = 'USD' WHERE currency = 'AED';
UPDATE payments SET currency = 'USD' WHERE currency = 'AED';

-- Accepted payment methods (admin-managed, shown at checkout).
CREATE TABLE IF NOT EXISTS payment_methods (
    id BIGSERIAL PRIMARY KEY,
    method_type VARCHAR(16) NOT NULL,
    display_name VARCHAR(64) NOT NULL,
    brand VARCHAR(32),
    masked_identifier VARCHAR(128),
    expiry VARCHAR(8),
    extra_info TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

INSERT INTO payment_methods (method_type, display_name, brand, masked_identifier, expiry, extra_info, enabled, is_default, sort_order) VALUES
('CARD', 'Visa Card', 'VISA', '•••• 4242', '12/28', NULL, TRUE, TRUE, 1),
('CARD', 'Mastercard', 'MASTERCARD', '•••• 5556', '09/27', NULL, TRUE, FALSE, 2),
('PAYPAL', 'PayPal', NULL, 'payments@gymholic.com', NULL, NULL, TRUE, FALSE, 3),
('BANK_TRANSFER', 'Bank Transfer', NULL, '•••• 8891', NULL, 'Contact us for wire instructions.', TRUE, FALSE, 4);
