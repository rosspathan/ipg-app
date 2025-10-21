-- =====================================================
-- CRITICAL SECURITY FIX: Protect User PII and Financial Data
-- Fixed with proper type casting for TEXT vs UUID columns
-- =====================================================

-- 1. FIX PROFILES TABLE (user_id is UUID)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. FIX KYC_PROFILES_NEW TABLE (user_id is TEXT - needs casting!)
ALTER TABLE public.kyc_profiles_new ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own KYC" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Users can insert own KYC" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Users can update own KYC" ON public.kyc_profiles_new;
DROP POLICY IF EXISTS "Admins can view all KYC" ON public.kyc_profiles_new;

CREATE POLICY "Users can view own KYC"
  ON public.kyc_profiles_new FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all KYC"
  ON public.kyc_profiles_new FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can insert own KYC"
  ON public.kyc_profiles_new FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own KYC"
  ON public.kyc_profiles_new FOR UPDATE
  USING (auth.uid()::text = user_id);

-- 3. FIX USER_BONUS_BALANCES (user_id is TEXT - needs casting!)
ALTER TABLE public.user_bonus_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own bonus balances" ON public.user_bonus_balances;
DROP POLICY IF EXISTS "Admins can view all bonus balances" ON public.user_bonus_balances;

CREATE POLICY "Users can view own bonus balances"
  ON public.user_bonus_balances FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all bonus balances"
  ON public.user_bonus_balances FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 4. FIX USER_AVATARS_NEW (user_id is UUID)
ALTER TABLE public.user_avatars_new ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own avatars" ON public.user_avatars_new;
DROP POLICY IF EXISTS "Users can insert own avatars" ON public.user_avatars_new;
DROP POLICY IF EXISTS "Users can update own avatars" ON public.user_avatars_new;

CREATE POLICY "Users can view own avatars"
  ON public.user_avatars_new FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own avatars"
  ON public.user_avatars_new FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own avatars"
  ON public.user_avatars_new FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. FIX USER_DAILY_AD_VIEWS (user_id is UUID)
ALTER TABLE public.user_daily_ad_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ad views" ON public.user_daily_ad_views;
DROP POLICY IF EXISTS "Users can insert own ad views" ON public.user_daily_ad_views;

CREATE POLICY "Users can view own ad views"
  ON public.user_daily_ad_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ad views"
  ON public.user_daily_ad_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 6. FIX SPIN_USER_LIMITS (user_id is UUID)
ALTER TABLE public.spin_user_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own spin limits" ON public.spin_user_limits;
DROP POLICY IF EXISTS "Users can update own spin limits" ON public.spin_user_limits;

CREATE POLICY "Users can view own spin limits"
  ON public.spin_user_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own spin limits"
  ON public.spin_user_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. PROTECT USER WALLETS (user_id is UUID)
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON public.user_wallets;

CREATE POLICY "Users can view own wallets"
  ON public.user_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallets"
  ON public.user_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 8. PROTECT WALLET BALANCES (user_id is UUID)
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own balances" ON public.wallet_balances;
DROP POLICY IF EXISTS "Admins can view all balances" ON public.wallet_balances;

CREATE POLICY "Users can view own balances"
  ON public.wallet_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all balances"
  ON public.wallet_balances FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 9. PROTECT USER BSK BALANCES (user_id is UUID)
ALTER TABLE public.user_bsk_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own BSK balances" ON public.user_bsk_balances;
DROP POLICY IF EXISTS "Admins can view all BSK balances" ON public.user_bsk_balances;

CREATE POLICY "Users can view own BSK balances"
  ON public.user_bsk_balances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all BSK balances"
  ON public.user_bsk_balances FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 10. PROTECT ORDERS TABLE (user_id is UUID)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 11. PROTECT TRADES TABLE (buyer_id and seller_id are UUID)
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trades" ON public.trades;
DROP POLICY IF EXISTS "Admins can view all trades" ON public.trades;

CREATE POLICY "Users can view own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can view all trades"
  ON public.trades FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));