-- Reset circuit breaker to enable trading
UPDATE trading_engine_settings 
SET circuit_breaker_active = false, 
    updated_at = now() 
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Also update any other rows if they exist
UPDATE trading_engine_settings 
SET circuit_breaker_active = false, 
    updated_at = now() 
WHERE circuit_breaker_active = true;