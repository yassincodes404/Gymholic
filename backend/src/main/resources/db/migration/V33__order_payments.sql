-- Orders can now carry payments: a Paymob intention is created for a
-- PENDING order and the webhook flips it to PAID (same lifecycle bookings
-- already use). One of booking_id / order_id is always set.
ALTER TABLE payments ALTER COLUMN booking_id DROP NOT NULL;
ALTER TABLE payments ADD COLUMN order_id BIGINT;
ALTER TABLE payments ADD CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES orders(id);
