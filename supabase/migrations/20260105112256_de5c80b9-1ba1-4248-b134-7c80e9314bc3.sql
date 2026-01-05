-- Seed IPG/USDT market price with initial price of 300
INSERT INTO market_prices (market_id, symbol, current_price, last_updated, price_change_24h, price_change_percentage_24h, high_24h, low_24h, volume_24h)
VALUES ('0a55af2b-9853-496d-8464-ad65db378ff7', 'IPG/USDT', 300, now(), 0, 0, 300, 300, 0)
ON CONFLICT (market_id) DO UPDATE SET current_price = 300, last_updated = now();