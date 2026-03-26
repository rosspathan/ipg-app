
-- ============================================================
-- SAFE RENAME: execute_trade overload OID 369792
-- Purpose: Resolve PostgreSQL function ambiguity blocking ALL trades
-- Rollback: ALTER FUNCTION public.execute_trade_deprecated_v1(...) RENAME TO execute_trade;
-- ============================================================

-- Step 1: Rename the OLD overload (numeric params before text params)
-- This is the stale version WITHOUT DB-level fee enforcement
ALTER FUNCTION public.execute_trade(
  p_buy_order_id uuid,
  p_sell_order_id uuid,
  p_buyer_id uuid,
  p_seller_id uuid,
  p_base_amount numeric,
  p_quote_amount numeric,
  p_buyer_fee numeric,
  p_seller_fee numeric,
  p_symbol text,
  p_base_asset text,
  p_quote_asset text,
  p_trading_type text
) RENAME TO execute_trade_deprecated_v1;

-- Step 2: Fix execute_trade_serializable to remove SET LOCAL TRANSACTION
-- which fails with "must be called before any query" when invoked via PostgREST RPC
CREATE OR REPLACE FUNCTION public.execute_trade_serializable(
  p_buy_order_id uuid,
  p_sell_order_id uuid,
  p_buyer_id uuid,
  p_seller_id uuid,
  p_symbol text,
  p_base_asset text,
  p_quote_asset text,
  p_base_amount numeric,
  p_quote_amount numeric,
  p_buyer_fee numeric,
  p_seller_fee numeric,
  p_trading_type text DEFAULT 'spot'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_trade_id UUID;
  v_attempt INT := 0;
  v_max_retries INT := 3;
BEGIN
  LOOP
    v_attempt := v_attempt + 1;
    BEGIN
      -- Delegate to the authoritative execute_trade function
      -- Note: SET LOCAL TRANSACTION ISOLATION LEVEL removed because
      -- PostgREST already starts the transaction before calling the RPC,
      -- making SET LOCAL fail with "must be called before any query".
      -- The execute_trade function uses FOR UPDATE row locks for safety.
      SELECT public.execute_trade(
        p_buy_order_id, p_sell_order_id,
        p_buyer_id, p_seller_id,
        p_symbol, p_base_asset, p_quote_asset,
        p_base_amount, p_quote_amount,
        p_buyer_fee, p_seller_fee,
        p_trading_type
      ) INTO v_trade_id;
      
      RETURN v_trade_id;
      
    EXCEPTION
      WHEN serialization_failure OR deadlock_detected THEN
        IF v_attempt >= v_max_retries THEN
          RAISE EXCEPTION 'Trade failed after % serialization retries for orders % / %', 
            v_max_retries, p_buy_order_id, p_sell_order_id;
        END IF;
        -- Brief pause before retry
        PERFORM pg_sleep(0.1 * v_attempt);
    END;
  END LOOP;
END;
$function$;
