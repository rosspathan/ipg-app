-- Cancel corrupted orders directly without unlocking (balances already consumed)
UPDATE orders 
SET status = 'cancelled', 
    updated_at = NOW()
WHERE id IN (
    'b0a9a730-d031-4c99-a7a8-b2717380fe36',  -- sell order
    '4c457e9a-5caa-452b-8ecf-7be572caa11f'   -- buy order
);