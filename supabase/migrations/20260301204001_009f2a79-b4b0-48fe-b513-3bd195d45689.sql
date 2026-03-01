
-- Drop the old 4-parameter version to prevent bypass
DROP FUNCTION IF EXISTS public.execute_internal_balance_transfer(uuid, uuid, numeric, text);
