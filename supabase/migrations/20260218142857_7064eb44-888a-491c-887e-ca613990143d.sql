
-- Fix double-credited USDT trading balance for user
-- The monitor-custodial-deposits re-credited 21.26612124 USDT that was already credited by the UI
UPDATE wallet_balances 
SET available = GREATEST(0, available - 21.26612124), updated_at = now()
WHERE user_id = '74852950-2a85-4079-8d28-877e561c255a' 
  AND asset_id = 'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0';
