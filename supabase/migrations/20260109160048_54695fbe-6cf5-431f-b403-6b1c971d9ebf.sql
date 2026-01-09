-- Allow authenticated users to view hot wallet addresses for deposits
-- This is safe because:
-- 1. Users only need to see the deposit address (which is public on blockchain anyway)
-- 2. The private key is stored in environment secrets, not in this table
-- 3. Users can only read active wallets

CREATE POLICY "Users can view hot wallet address for deposits"
  ON platform_hot_wallet
  FOR SELECT
  TO authenticated
  USING (is_active = true);