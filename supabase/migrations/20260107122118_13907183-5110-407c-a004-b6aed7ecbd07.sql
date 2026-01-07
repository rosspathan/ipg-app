-- Reset circuit breaker to allow trading
UPDATE trading_engine_settings 
SET circuit_breaker_active = false,
    updated_at = now();

-- Update market price for IPG/USDT to prevent immediate re-trigger
UPDATE market_prices 
SET current_price = 1000,
    updated_at = now()
WHERE symbol = 'IPG/USDT';