-- Add metadata column to bsk_transfers table if it doesn't exist
ALTER TABLE bsk_transfers 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add metadata column to bsk_withdrawal_requests table if it doesn't exist
ALTER TABLE bsk_withdrawal_requests 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Backfill sender information for transfer transactions
UPDATE bsk_transfers bt
SET metadata = COALESCE(bt.metadata, '{}'::jsonb) || jsonb_build_object(
  'sender_display_name', COALESCE(ps.display_name, ps.full_name, ps.username, ps.email, 'Unknown User'),
  'sender_username', ps.username,
  'sender_email', ps.email,
  'recipient_display_name', COALESCE(pr.display_name, pr.full_name, pr.username, pr.email, 'Unknown User'),
  'recipient_username', pr.username,
  'recipient_email', pr.email,
  'from_wallet_type', 'withdrawable',
  'to_wallet_type', 'withdrawable'
)
FROM profiles ps, profiles pr
WHERE bt.sender_id = ps.user_id
  AND bt.recipient_id = pr.user_id
  AND (bt.metadata IS NULL OR (bt.metadata->>'sender_display_name') IS NULL);

-- Backfill user information and wallet type for withdrawal transactions
UPDATE bsk_withdrawal_requests wr
SET metadata = COALESCE(wr.metadata, '{}'::jsonb) || jsonb_build_object(
  'user_display_name', COALESCE(p.display_name, p.full_name, p.username, p.email, 'Unknown User'),
  'user_username', p.username,
  'from_wallet_type', 'withdrawable',
  'withdrawal_type', wr.withdrawal_type,
  'bank_name', wr.bank_name,
  'account_holder_name', wr.account_holder_name,
  'crypto_symbol', wr.crypto_symbol,
  'crypto_address', wr.crypto_address,
  'crypto_network', wr.crypto_network
)
FROM profiles p
WHERE wr.user_id = p.user_id
  AND (wr.metadata IS NULL OR (wr.metadata->>'user_display_name') IS NULL);

-- Update ledger entries for transfers (withdrawable ledger)
UPDATE bsk_withdrawable_ledger wl
SET metadata = COALESCE(wl.metadata, '{}'::jsonb) || bt.metadata
FROM bsk_transfers bt
WHERE wl.reference_id = bt.id
  AND wl.tx_type IN ('transfer_in', 'transfer_out')
  AND bt.metadata IS NOT NULL
  AND (wl.metadata IS NULL OR (wl.metadata->>'sender_display_name') IS NULL AND (wl.metadata->>'recipient_display_name') IS NULL);

-- Update ledger entries for holding_to_withdrawable conversions
UPDATE bsk_withdrawable_ledger
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'from_wallet_type', 'holding',
  'to_wallet_type', 'withdrawable'
)
WHERE tx_type = 'holding_to_withdrawable'
  AND (metadata IS NULL OR (metadata->>'from_wallet_type') IS NULL);

UPDATE bsk_holding_ledger
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'from_wallet_type', 'holding',
  'to_wallet_type', 'withdrawable'
)
WHERE tx_type = 'holding_to_withdrawable'
  AND (metadata IS NULL OR (metadata->>'from_wallet_type') IS NULL);