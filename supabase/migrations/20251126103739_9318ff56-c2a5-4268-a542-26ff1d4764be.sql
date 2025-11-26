-- Drop the existing view first
DROP VIEW IF EXISTS unified_bsk_transactions;

-- Recreate the view with recipient/sender email and display_name from profiles
CREATE OR REPLACE VIEW unified_bsk_transactions AS
-- BSK Holding Ledger (holding balance transactions)
SELECT 
    bsk_holding_ledger.id,
    bsk_holding_ledger.user_id,
    bsk_holding_ledger.created_at,
    'holding'::text AS balance_type,
    bsk_holding_ledger.tx_type AS transaction_type,
    bsk_holding_ledger.amount_bsk AS amount,
    COALESCE(bsk_holding_ledger.notes, bsk_holding_ledger.tx_type) AS description,
    bsk_holding_ledger.metadata,
    bsk_holding_ledger.balance_after
FROM bsk_holding_ledger

UNION ALL

-- BSK Withdrawable Ledger (withdrawable balance transactions)
SELECT 
    bsk_withdrawable_ledger.id,
    bsk_withdrawable_ledger.user_id,
    bsk_withdrawable_ledger.created_at,
    'withdrawable'::text AS balance_type,
    bsk_withdrawable_ledger.tx_type AS transaction_type,
    bsk_withdrawable_ledger.amount_bsk AS amount,
    COALESCE(bsk_withdrawable_ledger.notes, bsk_withdrawable_ledger.tx_type) AS description,
    bsk_withdrawable_ledger.metadata,
    bsk_withdrawable_ledger.balance_after
FROM bsk_withdrawable_ledger

UNION ALL

-- BSK Transfers OUT (sender perspective) - with recipient email
SELECT 
    bsk_transfers.id,
    bsk_transfers.sender_id AS user_id,
    bsk_transfers.created_at,
    'withdrawable'::text AS balance_type,
    'transfer_out'::text AS transaction_type,
    -bsk_transfers.amount_bsk AS amount,
    'Sent to ' || COALESCE(recipient_profile.display_name, recipient_profile.email, 'Unknown') AS description,
    jsonb_build_object(
        'transfer_id', bsk_transfers.id,
        'recipient_id', bsk_transfers.recipient_id,
        'recipient_email', recipient_profile.email,
        'recipient_display_name', recipient_profile.display_name,
        'notes', bsk_transfers.notes,
        'transaction_ref', bsk_transfers.transaction_ref
    ) AS metadata,
    bsk_transfers.sender_balance_after AS balance_after
FROM bsk_transfers
LEFT JOIN profiles AS recipient_profile ON recipient_profile.user_id = bsk_transfers.recipient_id
WHERE bsk_transfers.status = 'completed'::text

UNION ALL

-- BSK Transfers IN (recipient perspective) - with sender email
SELECT 
    bsk_transfers.id,
    bsk_transfers.recipient_id AS user_id,
    bsk_transfers.created_at,
    'withdrawable'::text AS balance_type,
    'transfer_in'::text AS transaction_type,
    bsk_transfers.amount_bsk AS amount,
    'Received from ' || COALESCE(sender_profile.display_name, sender_profile.email, 'Unknown') AS description,
    jsonb_build_object(
        'transfer_id', bsk_transfers.id,
        'sender_id', bsk_transfers.sender_id,
        'sender_email', sender_profile.email,
        'sender_display_name', sender_profile.display_name,
        'notes', bsk_transfers.notes,
        'transaction_ref', bsk_transfers.transaction_ref
    ) AS metadata,
    bsk_transfers.recipient_balance_after AS balance_after
FROM bsk_transfers
LEFT JOIN profiles AS sender_profile ON sender_profile.user_id = bsk_transfers.sender_id
WHERE bsk_transfers.status = 'completed'::text

ORDER BY created_at DESC;