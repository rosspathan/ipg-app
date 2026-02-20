
-- ============================================================
-- FIX 1: escrow_withdrawals - Enable RLS and restrict to owner + admin
-- ============================================================
ALTER TABLE public.escrow_withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.escrow_withdrawals;
CREATE POLICY "Users can view own withdrawals"
  ON public.escrow_withdrawals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all withdrawals" ON public.escrow_withdrawals;
CREATE POLICY "Admins can view all withdrawals"
  ON public.escrow_withdrawals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.escrow_withdrawals;
CREATE POLICY "Users can insert own withdrawals"
  ON public.escrow_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update withdrawals" ON public.escrow_withdrawals;
CREATE POLICY "Admins can update withdrawals"
  ON public.escrow_withdrawals FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "System can manage withdrawals" ON public.escrow_withdrawals;
CREATE POLICY "System can manage withdrawals"
  ON public.escrow_withdrawals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- FIX 2: assets table - Restrict write operations to admins only
-- ============================================================
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Keep public read (intentional for market data display)
DROP POLICY IF EXISTS "Anyone can view assets" ON public.assets;
CREATE POLICY "Anyone can view assets"
  ON public.assets FOR SELECT
  USING (true);

-- Restrict INSERT to admins only
DROP POLICY IF EXISTS "Admins can insert assets" ON public.assets;
CREATE POLICY "Admins can insert assets"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict UPDATE to admins only
DROP POLICY IF EXISTS "Admins can update assets" ON public.assets;
CREATE POLICY "Admins can update assets"
  ON public.assets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Restrict DELETE to admins only
DROP POLICY IF EXISTS "Admins can delete assets" ON public.assets;
CREATE POLICY "Admins can delete assets"
  ON public.assets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
