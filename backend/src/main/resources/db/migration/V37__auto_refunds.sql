-- Automatic refunds via the gateway:
--  * payments.provider_charge_id keeps the gateway's transaction id
--    (Paymob's "obj.id" from the verified webhook). Refunds are issued
--    against that id; the order id we already store can't be refunded.
--    Nullable — payments made before this deploy backfill on their next
--    webhook-bearing event.
--  * REFUNDS_AUTO_PROCESS_ENABLED lets the team turn automatic gateway
--    refunds off (Admin → Settings) and fall back to manual settlement.
ALTER TABLE payments
    ADD COLUMN provider_charge_id VARCHAR(100);

INSERT INTO settings (setting_key, setting_value, description, updated_at) VALUES
('REFUNDS_AUTO_PROCESS_ENABLED', 'true', 'Automatically refund the gateway when a client cancels inside the free window', CURRENT_TIMESTAMP)
ON CONFLICT (setting_key) DO NOTHING;
