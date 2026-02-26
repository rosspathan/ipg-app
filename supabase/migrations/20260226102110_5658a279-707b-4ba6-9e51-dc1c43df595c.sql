-- ============================================================
-- 1. FIX: profiles_public view - remove full_name (PII), add security_invoker
-- ============================================================
DROP VIEW IF EXISTS profiles_public;
CREATE VIEW profiles_public 
WITH (security_invoker = on)
AS SELECT 
  user_id,
  username,
  display_name,
  referral_code,
  created_at
FROM profiles;

REVOKE SELECT ON profiles_public FROM anon;
GRANT SELECT ON profiles_public TO authenticated;

-- ============================================================
-- 2. FIX: Tighten admin_notifications INSERT (service_role only)
-- ============================================================
DROP POLICY IF EXISTS "System can create notifications" ON admin_notifications;

-- ============================================================
-- 3. FIX: Make ad-media bucket private
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'ad-media';

-- ============================================================
-- 4. FIX: Fix function search_path on mirror_bsk_ledger_to_trading
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'mirror_bsk_ledger_to_trading') THEN
    ALTER FUNCTION public.mirror_bsk_ledger_to_trading() SET search_path = public;
  END IF;
END $$;

-- ============================================================
-- 5. FIX: Cleanup duplicate user_wallets policies
-- ============================================================
DROP POLICY IF EXISTS "Users can view own wallet" ON user_wallets;
DROP POLICY IF EXISTS "Users can insert own wallets" ON user_wallets;