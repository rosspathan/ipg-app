
-- ============================================================
-- FIX 1: Remove privilege escalation via raw_user_meta_data admin checks
-- Tables: bsk_supply_ledger, user_inr_balances, bsk_rate_history
-- ============================================================

-- bsk_supply_ledger: drop vulnerable policies
DROP POLICY IF EXISTS "Admin can view BSK supply ledger" ON bsk_supply_ledger;
DROP POLICY IF EXISTS "Admin can insert BSK supply ledger" ON bsk_supply_ledger;

-- Replace with secure has_role() based policies
CREATE POLICY "Secure admin view BSK supply ledger"
  ON bsk_supply_ledger FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Secure admin insert BSK supply ledger"
  ON bsk_supply_ledger FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- bsk_rate_history: drop vulnerable policy (keep the secure one if exists)
DROP POLICY IF EXISTS "Admin can manage BSK rates" ON bsk_rate_history;

-- user_inr_balances: drop vulnerable policies
DROP POLICY IF EXISTS "Admin can manage INR balances" ON user_inr_balances;
DROP POLICY IF EXISTS "Admin can view all INR balances" ON user_inr_balances;

-- Replace with secure policies
CREATE POLICY "Secure admin manage INR balances"
  ON user_inr_balances FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- FIX 2: Restrict user_badge_status SELECT to owner + admin
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view badge status" ON user_badge_status;
DROP POLICY IF EXISTS "Public can view badge status" ON user_badge_status;
DROP POLICY IF EXISTS "Users can view all badge statuses" ON user_badge_status;

CREATE POLICY "Owner or admin can view badge status"
  ON user_badge_status FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- FIX 3: Restrict login_history INSERT to service_role only
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert login history" ON login_history;

CREATE POLICY "Service role insert login history"
  ON login_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- FIX 4: Restrict referral_user_state to owner read + service_role write
-- ============================================================
DROP POLICY IF EXISTS "System can manage user states" ON referral_user_state;

CREATE POLICY "Users can view own referral state"
  ON referral_user_state FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manage referral state"
  ON referral_user_state FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- FIX 5: Restrict withdrawal_retry_queue to service_role only
-- ============================================================
DROP POLICY IF EXISTS "Service role full access on retry queue" ON withdrawal_retry_queue;

CREATE POLICY "Service role manage retry queue"
  ON withdrawal_retry_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can view retry queue"
  ON withdrawal_retry_queue FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
