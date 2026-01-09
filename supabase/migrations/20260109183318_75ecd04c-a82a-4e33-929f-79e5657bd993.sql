-- Fix the overly permissive RLS policy on onchain_balances
DROP POLICY IF EXISTS "Service role can manage onchain balances" ON public.onchain_balances;

-- Note: Service role bypasses RLS automatically, so we don't need a separate policy for it.
-- The only policy needed is for users to read their own balances.