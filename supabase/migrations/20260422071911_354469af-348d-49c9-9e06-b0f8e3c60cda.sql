
-- Manually credit the stuck $32.1 USDT deposit for nandiniduggiperi@gmail.com
-- tx: 0xb6915a9dd50e8b3d8d4a650baf9bd16da5e5e9b3577934f28e05c42fe0bc60f8
-- deposit_id: 976433cc-8717-42c2-863e-f0c29a4923a8
-- transfer_id: 62f3025e-1d2d-4e7e-9700-8dc297c45518

DO $$
DECLARE
  v_result jsonb;
  v_user uuid := '6e0531de-074a-4643-ac3a-44fe47089281';
  v_deposit uuid := '976433cc-8717-42c2-863e-f0c29a4923a8';
  v_transfer uuid := '62f3025e-1d2d-4e7e-9700-8dc297c45518';
BEGIN
  -- 1. Credit deposit via the canonical SECURITY DEFINER RPC
  --    (atomically inserts ledger + updates wallet_balances + marks deposit credited)
  SELECT credit_custodial_deposit(v_deposit) INTO v_result;
  RAISE NOTICE 'credit_custodial_deposit result: %', v_result;

  -- 2. Settle the matching internal_balance_transfers row so the user's
  --    "To Trading" history shows Completed instead of Pending.
  UPDATE internal_balance_transfers
  SET status = 'completed',
      updated_at = now(),
      notes = COALESCE(notes,'') || ' | Manually settled by admin (matching custodial_deposits row already credited via credit_custodial_deposit)'
  WHERE id = v_transfer
    AND status = 'pending';

  RAISE NOTICE 'Internal transfer settled.';
END $$;

-- Verification block
SELECT 'deposit_after' as check, status, credited_at::text as detail
FROM custodial_deposits WHERE id='976433cc-8717-42c2-863e-f0c29a4923a8'
UNION ALL
SELECT 'transfer_after', status, updated_at::text
FROM internal_balance_transfers WHERE id='62f3025e-1d2d-4e7e-9700-8dc297c45518'
UNION ALL
SELECT 'wallet_after', a.symbol, wb.available::text
FROM wallet_balances wb JOIN assets a ON a.id=wb.asset_id
WHERE wb.user_id='6e0531de-074a-4643-ac3a-44fe47089281' AND a.symbol='USDT';
