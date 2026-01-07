UPDATE trading_engine_settings
SET circuit_breaker_active = false,
    updated_at = now();