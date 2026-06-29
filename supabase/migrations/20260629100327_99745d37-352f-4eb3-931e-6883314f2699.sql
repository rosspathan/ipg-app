CREATE OR REPLACE FUNCTION public.admin_bsk_user_report()
RETURNS TABLE (
  user_id uuid,
  username text,
  email text,
  wallet_address text,
  withdrawable_balance numeric,
  holding_balance numeric,
  total_held numeric,
  total_earned numeric,
  total_deducted numeric,
  fees_paid numeric,
  pending_withdrawals_count integer,
  pending_withdrawals_amount numeric,
  completed_withdrawals_count integer,
  completed_withdrawals_amount numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.username, ''), NULLIF(p.full_name, ''), 'N/A') AS username,
    COALESCE(NULLIF(p.email, ''), 'N/A') AS email,
    COALESCE(p.bsc_wallet_address, p.wallet_address) AS wallet_address,
    COALESCE(b.withdrawable_balance, 0) AS withdrawable_balance,
    COALESCE(b.holding_balance, 0) AS holding_balance,
    COALESCE(b.withdrawable_balance, 0) + COALESCE(b.holding_balance, 0) AS total_held,
    COALESCE(b.total_earned_withdrawable, 0) + COALESCE(b.total_earned_holding, 0) AS total_earned,
    COALESCE(led.total_deducted, 0) AS total_deducted,
    COALESCE(led.fees_paid, 0) AS fees_paid,
    COALESCE(w.pending_count, 0)::integer AS pending_withdrawals_count,
    COALESCE(w.pending_amount, 0) AS pending_withdrawals_amount,
    COALESCE(w.completed_count, 0)::integer AS completed_withdrawals_count,
    COALESCE(w.completed_amount, 0) AS completed_withdrawals_amount,
    p.created_at
  FROM public.profiles p
  LEFT JOIN public.user_bsk_balances b ON b.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id,
      SUM(CASE WHEN tx_type = 'debit' THEN amount_bsk ELSE 0 END) AS total_deducted,
      SUM(CASE WHEN tx_type = 'debit' AND (tx_subtype ILIKE '%fee%' OR tx_subtype ILIKE '%late%') THEN amount_bsk ELSE 0 END) AS fees_paid
    FROM public.unified_bsk_ledger
    GROUP BY user_id
  ) led ON led.user_id = p.user_id
  LEFT JOIN (
    SELECT user_id,
      COUNT(*) FILTER (WHERE status IN ('pending','processing','under_review','submitted')) AS pending_count,
      SUM(amount_bsk) FILTER (WHERE status IN ('pending','processing','under_review','submitted')) AS pending_amount,
      COUNT(*) FILTER (WHERE status IN ('completed','approved','paid','success')) AS completed_count,
      SUM(amount_bsk) FILTER (WHERE status IN ('completed','approved','paid','success')) AS completed_amount
    FROM public.bsk_withdrawal_requests
    GROUP BY user_id
  ) w ON w.user_id = p.user_id;
$$;

REVOKE ALL ON FUNCTION public.admin_bsk_user_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_bsk_user_report() TO service_role;