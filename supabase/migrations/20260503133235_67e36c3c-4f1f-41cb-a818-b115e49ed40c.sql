-- Phase 2: Manual-review safety net + reconciliation views (auto-credit unchanged)

-- A. Admin metadata columns on deposits
ALTER TABLE public.custodial_deposits
  ADD COLUMN IF NOT EXISTS review_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text;

-- B. Manual-review view (only abnormal rows)
CREATE OR REPLACE VIEW public.admin_manual_review_deposits AS
SELECT
  cd.id, cd.tx_hash, cd.user_id, cd.asset_id,
  a.symbol AS asset_symbol, a.contract_address, a.decimals,
  cd.amount, cd.from_address, cd.status,
  cd.confirmations, cd.required_confirmations,
  cd.created_at, cd.updated_at, cd.credited_at,
  cd.linked_internal_transfer_id,
  cd.review_reason, cd.reviewed_by, cd.reviewed_at, cd.admin_notes,
  CASE
    WHEN cd.status='manual_review' THEN 'manual_review'
    WHEN cd.status='failed' THEN 'failed'
    WHEN cd.status='rejected' THEN 'rejected'
    WHEN cd.status='pending' AND cd.created_at < now() - interval '10 minutes' THEN 'stuck_pending'
    WHEN cd.status='confirmed' AND cd.credited_at IS NULL THEN 'confirmed_not_credited'
    ELSE cd.status
  END AS review_bucket,
  p.email AS user_email,
  p.username AS user_username
FROM public.custodial_deposits cd
LEFT JOIN public.assets a ON a.id = cd.asset_id
LEFT JOIN public.profiles p ON p.user_id = cd.user_id
WHERE cd.status IN ('manual_review','failed','rejected')
   OR (cd.status='pending' AND cd.created_at < now() - interval '10 minutes')
   OR (cd.status='confirmed' AND cd.credited_at IS NULL);

REVOKE ALL ON public.admin_manual_review_deposits FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_manual_review_deposits TO authenticated;

-- C. Guarded list function
CREATE OR REPLACE FUNCTION public.admin_list_manual_review_deposits()
RETURNS SETOF public.admin_manual_review_deposits
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT * FROM public.admin_manual_review_deposits
  WHERE public.has_role(auth.uid(),'admin')
  ORDER BY created_at DESC;
$$;

-- D. Admin credit (delegates to atomic credit RPC)
CREATE OR REPLACE FUNCTION public.admin_credit_manual_review_deposit(
  p_deposit_id uuid, p_admin_note text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_admin uuid := auth.uid(); v_result jsonb;
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN RAISE EXCEPTION 'forbidden: admin role required'; END IF;
  IF p_admin_note IS NULL OR length(trim(p_admin_note))=0 THEN RAISE EXCEPTION 'admin_note is required'; END IF;
  v_result := public.credit_custodial_deposit(p_deposit_id);
  UPDATE public.custodial_deposits
     SET reviewed_by=v_admin, reviewed_at=now(),
         admin_notes=COALESCE(admin_notes,'')||E'\n[admin-credit] '||p_admin_note
   WHERE id=p_deposit_id;
  INSERT INTO public.admin_notifications(type,title,message,priority,metadata)
  VALUES('manual_review_action','Manual deposit credited by admin',
         'Deposit '||p_deposit_id||' credited. Note: '||p_admin_note,'high',
         jsonb_build_object('deposit_id',p_deposit_id,'admin',v_admin,'action','credit'));
  RETURN v_result;
END; $$;

-- E. Admin reject (no balance change)
CREATE OR REPLACE FUNCTION public.admin_reject_manual_review_deposit(
  p_deposit_id uuid, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_admin uuid := auth.uid(); v_row public.custodial_deposits%ROWTYPE;
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN RAISE EXCEPTION 'forbidden: admin role required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason))=0 THEN RAISE EXCEPTION 'reason is required'; END IF;
  SELECT * INTO v_row FROM public.custodial_deposits WHERE id=p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit not found'; END IF;
  IF v_row.status='credited' THEN RAISE EXCEPTION 'cannot reject an already-credited deposit'; END IF;
  UPDATE public.custodial_deposits
     SET status='rejected', review_reason=p_reason, reviewed_by=v_admin, reviewed_at=now(),
         admin_notes=COALESCE(admin_notes,'')||E'\n[admin-reject] '||p_reason, updated_at=now()
   WHERE id=p_deposit_id;
  INSERT INTO public.admin_notifications(type,title,message,priority,metadata)
  VALUES('manual_review_action','Manual deposit rejected',
         'Deposit '||p_deposit_id||' rejected. Reason: '||p_reason,'high',
         jsonb_build_object('deposit_id',p_deposit_id,'admin',v_admin,'action','reject','reason',p_reason));
  RETURN jsonb_build_object('success',true,'status','rejected');
END; $$;

-- F. Admin reassign (only when not credited)
CREATE OR REPLACE FUNCTION public.admin_reassign_manual_review_deposit(
  p_deposit_id uuid, p_new_user_id uuid, p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_admin uuid := auth.uid(); v_row public.custodial_deposits%ROWTYPE;
BEGIN
  IF NOT public.has_role(v_admin,'admin') THEN RAISE EXCEPTION 'forbidden: admin role required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason))=0 THEN RAISE EXCEPTION 'reason is required'; END IF;
  IF p_new_user_id IS NULL THEN RAISE EXCEPTION 'new user id required'; END IF;
  SELECT * INTO v_row FROM public.custodial_deposits WHERE id=p_deposit_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'deposit not found'; END IF;
  IF v_row.status='credited' THEN RAISE EXCEPTION 'cannot reassign an already-credited deposit'; END IF;
  UPDATE public.custodial_deposits
     SET user_id=p_new_user_id, review_reason=p_reason, reviewed_by=v_admin, reviewed_at=now(),
         admin_notes=COALESCE(admin_notes,'')||E'\n[admin-reassign->'||p_new_user_id::text||'] '||p_reason,
         updated_at=now()
   WHERE id=p_deposit_id;
  INSERT INTO public.admin_notifications(type,title,message,priority,metadata)
  VALUES('manual_review_action','Manual deposit reassigned',
         'Deposit '||p_deposit_id||' reassigned to '||p_new_user_id||'. Reason: '||p_reason,'high',
         jsonb_build_object('deposit_id',p_deposit_id,'admin',v_admin,'action','reassign',
                            'old_user',v_row.user_id,'new_user',p_new_user_id,'reason',p_reason));
  RETURN jsonb_build_object('success',true,'status','reassigned','new_user_id',p_new_user_id);
END; $$;

REVOKE ALL ON FUNCTION public.admin_list_manual_review_deposits() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_credit_manual_review_deposit(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_reject_manual_review_deposit(uuid,text) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.admin_reassign_manual_review_deposit(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_list_manual_review_deposits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_credit_manual_review_deposit(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_manual_review_deposit(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reassign_manual_review_deposit(uuid,uuid,text) TO authenticated;

-- =====================================================================
-- G. RECONCILIATION VIEWS
-- =====================================================================

CREATE OR REPLACE VIEW public.admin_recon_deposits_by_asset AS
SELECT
  a.symbol,
  COUNT(cd.id) AS total_deposits,
  COUNT(*) FILTER (WHERE cd.status='credited') AS credited_count,
  COALESCE(SUM(cd.amount) FILTER (WHERE cd.status='credited'),0) AS credited_amount,
  COUNT(*) FILTER (WHERE cd.status='pending') AS pending_count,
  COUNT(*) FILTER (WHERE cd.status='manual_review') AS manual_review_count,
  COUNT(*) FILTER (WHERE cd.status='failed') AS failed_count,
  COUNT(*) FILTER (WHERE cd.status='rejected') AS rejected_count,
  COUNT(*) FILTER (WHERE cd.status='credited' AND NOT EXISTS (
    SELECT 1 FROM public.trading_balance_ledger l
    WHERE l.reference_type='custodial_deposit' AND l.reference_id=cd.id
  )) AS credited_without_ledger
FROM public.assets a
LEFT JOIN public.custodial_deposits cd ON cd.asset_id=a.id
GROUP BY a.symbol;

CREATE OR REPLACE VIEW public.admin_recon_balances_by_asset AS
SELECT
  a.symbol,
  COALESCE(SUM(wb.available),0) AS user_available,
  COALESCE(SUM(wb.locked),0) AS user_locked,
  COALESCE(SUM(wb.available),0) + COALESCE(SUM(wb.locked),0) AS user_total_liability
FROM public.assets a
LEFT JOIN public.wallet_balances wb ON wb.asset_id=a.id
GROUP BY a.symbol;

CREATE OR REPLACE VIEW public.admin_recon_withdrawals_by_asset AS
SELECT
  a.symbol,
  COUNT(w.id) AS total_withdrawals,
  COUNT(*) FILTER (WHERE w.status='pending') AS pending_count,
  COALESCE(SUM(w.amount) FILTER (WHERE w.status='pending'),0) AS pending_amount,
  COUNT(*) FILTER (WHERE w.status='completed') AS completed_count,
  COALESCE(SUM(w.amount) FILTER (WHERE w.status='completed'),0) AS completed_amount,
  COUNT(*) FILTER (WHERE w.status IN ('failed','refunded','rejected')) AS failed_or_refunded_count,
  COALESCE(SUM(w.fee) FILTER (WHERE w.status='completed'),0) AS fees_collected
FROM public.assets a
LEFT JOIN public.withdrawals w ON w.asset_id=a.id
GROUP BY a.symbol;

CREATE OR REPLACE VIEW public.admin_recon_solvency_by_asset AS
SELECT
  a.symbol,
  COALESCE(d.credited_amount,0) AS deposits_credited,
  COALESCE(w.completed_amount,0) AS withdrawn_amount,
  COALESCE(w.pending_amount,0) AS pending_withdrawals,
  COALESCE(b.user_available,0) AS user_available,
  COALESCE(b.user_locked,0) AS user_locked,
  COALESCE(d.credited_amount,0)
    - COALESCE(w.completed_amount,0)
    - COALESCE(w.pending_amount,0)
    - COALESCE(b.user_available,0)
    - COALESCE(b.user_locked,0) AS drift
FROM public.assets a
LEFT JOIN public.admin_recon_deposits_by_asset d ON d.symbol=a.symbol
LEFT JOIN public.admin_recon_withdrawals_by_asset w ON w.symbol=a.symbol
LEFT JOIN public.admin_recon_balances_by_asset b ON b.symbol=a.symbol;

CREATE OR REPLACE VIEW public.admin_recon_user_asset_summary AS
SELECT
  wb.user_id,
  a.symbol,
  wb.available, wb.locked, wb.total,
  (SELECT COALESCE(SUM(cd.amount),0) FROM public.custodial_deposits cd
     WHERE cd.user_id=wb.user_id AND cd.asset_id=a.id AND cd.status='credited') AS deposits_credited,
  (SELECT COALESCE(SUM(w.amount),0) FROM public.withdrawals w
     WHERE w.user_id=wb.user_id AND w.asset_id=a.id AND w.status='completed') AS withdrawn,
  (SELECT COALESCE(SUM(l.delta_available)+SUM(l.delta_locked),0)
     FROM public.trading_balance_ledger l
     WHERE l.user_id=wb.user_id AND l.asset_symbol=a.symbol) AS ledger_net
FROM public.wallet_balances wb
JOIN public.assets a ON a.id=wb.asset_id;

REVOKE ALL ON public.admin_recon_deposits_by_asset, public.admin_recon_balances_by_asset,
              public.admin_recon_withdrawals_by_asset, public.admin_recon_solvency_by_asset,
              public.admin_recon_user_asset_summary FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_recon_deposits_by_asset, public.admin_recon_balances_by_asset,
                public.admin_recon_withdrawals_by_asset, public.admin_recon_solvency_by_asset,
                public.admin_recon_user_asset_summary TO authenticated;