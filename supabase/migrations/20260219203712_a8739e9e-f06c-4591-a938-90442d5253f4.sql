
-- Fix: Add 'withdrawal' and keep 'withdraw' in allowed tx_type values
ALTER TABLE crypto_staking_ledger DROP CONSTRAINT IF EXISTS crypto_staking_ledger_tx_type_check;

ALTER TABLE crypto_staking_ledger ADD CONSTRAINT crypto_staking_ledger_tx_type_check 
  CHECK (tx_type IN ('deposit', 'stake', 'unstake', 'reward', 'withdraw', 'withdrawal', 'early_unstake', 'penalty', 'admin_credit', 'admin_debit'));
