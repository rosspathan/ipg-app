-- Drop the OLDER execute_trade overload (where p_symbol comes AFTER p_seller_id)
-- This resolves the "Could not choose the best candidate function" ambiguity error
-- that prevents ALL trade executions from completing.
-- The NEWER version (where numeric params come after UUIDs) will remain.
DROP FUNCTION IF EXISTS public.execute_trade(uuid, uuid, uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, text);