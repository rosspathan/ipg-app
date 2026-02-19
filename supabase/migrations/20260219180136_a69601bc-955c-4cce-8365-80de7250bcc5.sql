
-- Fix 1: Restrict user_avatars_new table - remove public read, add owner + admin policies
DROP POLICY IF EXISTS "Everyone can view avatars" ON public.user_avatars_new;
DROP POLICY IF EXISTS "Users can view own avatar" ON public.user_avatars_new;
DROP POLICY IF EXISTS "Admin can view all avatars" ON public.user_avatars_new;

-- Users can only view their own avatar
CREATE POLICY "Users can view own avatar"
  ON public.user_avatars_new
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all avatars
CREATE POLICY "Admin can view all avatars"
  ON public.user_avatars_new
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Harden market_prices write access - restrict updates to admin only
DROP POLICY IF EXISTS "System can manage market prices" ON public.market_prices;
DROP POLICY IF EXISTS "Admin can manage market prices" ON public.market_prices;
DROP POLICY IF EXISTS "Anyone can read market prices" ON public.market_prices;

-- Public read (needed for trading UI)
CREATE POLICY "Anyone can read market prices"
  ON public.market_prices
  FOR SELECT
  USING (true);

-- Only admins/service role can write prices
CREATE POLICY "Admin can manage market prices"
  ON public.market_prices
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix 3: Harden bsk_rate_history - use has_role() instead of user metadata
DROP POLICY IF EXISTS "Admin can manage BSK rate history" ON public.bsk_rate_history;
DROP POLICY IF EXISTS "Anyone can read BSK rate history" ON public.bsk_rate_history;
DROP POLICY IF EXISTS "Admin manage bsk rate history" ON public.bsk_rate_history;

-- Public read (needed for rate display)
CREATE POLICY "Anyone can read BSK rate history"
  ON public.bsk_rate_history
  FOR SELECT
  USING (true);

-- Only admins can write rate history (using has_role, not metadata)
CREATE POLICY "Admin manage bsk rate history"
  ON public.bsk_rate_history
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
