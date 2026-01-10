-- Clean up unauthorized wallet_balances that were created without proper custodial deposits
-- This removes balances that were incorrectly credited by sync-user-balances

-- First, create a backup table for audit purposes
CREATE TABLE IF NOT EXISTS wallet_balances_cleanup_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL,
  available NUMERIC NOT NULL,
  locked NUMERIC NOT NULL,
  original_created_at TIMESTAMPTZ NOT NULL,
  cleaned_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT DEFAULT 'No corresponding custodial_deposits record'
);

-- Insert records to be deleted into audit table
INSERT INTO wallet_balances_cleanup_audit (user_id, asset_id, available, locked, original_created_at)
SELECT wb.user_id, wb.asset_id, wb.available, wb.locked, wb.created_at
FROM wallet_balances wb
WHERE NOT EXISTS (
  SELECT 1 FROM custodial_deposits cd 
  WHERE cd.user_id = wb.user_id 
    AND cd.asset_id = wb.asset_id 
    AND cd.status = 'credited'
)
AND wb.available > 0
-- Exclude admin/system user if needed
AND wb.user_id != '74852950-2a85-4079-8d28-877e561c255a';

-- Delete the unauthorized balances
DELETE FROM wallet_balances wb
WHERE NOT EXISTS (
  SELECT 1 FROM custodial_deposits cd 
  WHERE cd.user_id = wb.user_id 
    AND cd.asset_id = wb.asset_id 
    AND cd.status = 'credited'
)
AND wb.available > 0
-- Exclude admin/system user if needed
AND wb.user_id != '74852950-2a85-4079-8d28-877e561c255a';