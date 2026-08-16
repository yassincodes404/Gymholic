-- Payment gateways (Paymob now, Stripe later) are managed from
-- Admin -> Integrations; their credentials live in the settings table.
-- The standalone "accepted payment methods" table from V22 is retired.
DROP TABLE IF EXISTS payment_methods;

-- The enable toggle is stored on first save from the admin UI; absent means
-- "follow the PAYMOB_* env configuration" (previous behavior), so nothing
-- is seeded here.
