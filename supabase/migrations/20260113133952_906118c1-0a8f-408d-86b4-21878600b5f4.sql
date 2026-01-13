-- Fix: execute_trade must not UPDATE orders.remaining_amount (generated column)
CREATE OR REPLACE FUNCTION public.execute_trade(
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
  p_trading_type text DEFAULT 'spot'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_base_asset_id UUID;
    v_quote_asset_id UUID;
    v_buyer_quote_locked NUMERIC;
    v_seller_base_locked NUMERIC;
    v_buyer_quote_required NUMERIC;
    v_seller_base_required NUMERIC;
    v_trade_id UUID;
    v_buy_filled NUMERIC;
    v_sell_filled NUMERIC;
    v_buy_amount NUMERIC;
    v_sell_amount NUMERIC;
    v_buy_price NUMERIC;
    v_total_fees NUMERIC;
    v_platform_account_id UUID := '00000000-0000-0000-0000-000000000001';
    v_reserved_for_this_fill NUMERIC;
    v_actual_used NUMERIC;
    v_refund_amount NUMERIC;
    v_buyer_locked_before NUMERIC;
    v_buyer_locked_after NUMERIC;
BEGIN
    -- Quantize all amounts to 8 decimals
    p_base_amount := ROUND(p_base_amount, 8);
    p_quote_amount := ROUND(p_quote_amount, 8);
    p_buyer_fee := ROUND(p_buyer_fee, 8);
    p_seller_fee := ROUND(p_seller_fee, 8);
    v_total_fees := p_buyer_fee + p_seller_fee;

    -- Get asset IDs
    SELECT id INTO v_base_asset_id FROM assets WHERE symbol = p_base_asset;
    SELECT id INTO v_quote_asset_id FROM assets WHERE symbol = p_quote_asset;

    IF v_base_asset_id IS NULL OR v_quote_asset_id IS NULL THEN
        RAISE EXCEPTION 'Asset not found: base=%, quote=%', p_base_asset, p_quote_asset;
    END IF;

    -- Get the buy order's price for refund calculation
    SELECT price INTO v_buy_price FROM orders WHERE id = p_buy_order_id;

    -- Calculate what was actually used (based on execution price, not lock price)
    v_actual_used := p_quote_amount + p_buyer_fee;

    -- Calculate what was reserved for this portion based on the original lock logic
    -- Lock formula from place-order: quantity * order_price * 1.005
    v_reserved_for_this_fill := ROUND(p_base_amount * v_buy_price * 1.005, 8);

    -- Calculate refund: reserved - actual used
    v_refund_amount := GREATEST(v_reserved_for_this_fill - v_actual_used, 0);

    -- Required to consume from locked = actual amount used (not reserved)
    v_buyer_quote_required := v_actual_used;
    v_seller_base_required := p_base_amount;

    -- Lock rows and get current locked balances
    SELECT locked INTO v_buyer_quote_locked
    FROM wallet_balances
    WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id
    FOR UPDATE;

    SELECT locked INTO v_seller_base_locked
    FROM wallet_balances
    WHERE user_id = p_seller_id AND asset_id = v_base_asset_id
    FOR UPDATE;

    v_buyer_locked_before := COALESCE(v_buyer_quote_locked, 0);

    -- Validate locked balances - need at least the actual amount to consume
    IF v_buyer_locked_before < v_buyer_quote_required THEN
        RAISE EXCEPTION 'Insufficient buyer locked balance: has %, needs %',
            v_buyer_locked_before, v_buyer_quote_required;
    END IF;

    IF COALESCE(v_seller_base_locked, 0) < v_seller_base_required THEN
        RAISE EXCEPTION 'Insufficient seller locked balance: has %, needs %',
            COALESCE(v_seller_base_locked, 0), v_seller_base_required;
    END IF;

    -- 1) Buyer: consume actual used from locked; refund excess reserved back to available
    UPDATE wallet_balances
    SET locked = GREATEST(locked - v_buyer_quote_required - v_refund_amount, 0),
        available = available + v_refund_amount,
        updated_at = NOW()
    WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id;

    SELECT locked INTO v_buyer_locked_after
    FROM wallet_balances
    WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id;

    -- Seller: credit quote minus seller fee
    INSERT INTO wallet_balances (user_id, asset_id, available, locked)
    VALUES (p_seller_id, v_quote_asset_id, p_quote_amount - p_seller_fee, 0)
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET
        available = wallet_balances.available + (p_quote_amount - p_seller_fee),
        updated_at = NOW();

    -- 2) Seller: release base from locked
    UPDATE wallet_balances
    SET locked = GREATEST(locked - v_seller_base_required, 0),
        updated_at = NOW()
    WHERE user_id = p_seller_id AND asset_id = v_base_asset_id;

    -- Buyer: credit base
    INSERT INTO wallet_balances (user_id, asset_id, available, locked)
    VALUES (p_buyer_id, v_base_asset_id, p_base_amount, 0)
    ON CONFLICT (user_id, asset_id)
    DO UPDATE SET
        available = wallet_balances.available + p_base_amount,
        updated_at = NOW();

    -- 3) Fees -> platform account
    IF v_total_fees > 0 THEN
        INSERT INTO wallet_balances (user_id, asset_id, available, locked)
        VALUES (v_platform_account_id, v_quote_asset_id, v_total_fees, 0)
        ON CONFLICT (user_id, asset_id)
        DO UPDATE SET
            available = wallet_balances.available + v_total_fees,
            updated_at = NOW();
    END IF;

    -- 4) Trade record
    INSERT INTO trades (
        buy_order_id, sell_order_id, buyer_id, seller_id,
        symbol, quantity, price, total_value,
        buyer_fee, seller_fee, fee_asset, trading_type
    ) VALUES (
        p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id,
        p_symbol, p_base_amount,
        CASE WHEN p_base_amount > 0 THEN ROUND(p_quote_amount / p_base_amount, 8) ELSE 0 END,
        p_quote_amount, p_buyer_fee, p_seller_fee, p_quote_asset, p_trading_type
    ) RETURNING id INTO v_trade_id;

    -- 5) Update orders (NOTE: remaining_amount is a generated column, do NOT update it)
    SELECT amount, filled_amount INTO v_buy_amount, v_buy_filled
    FROM orders WHERE id = p_buy_order_id FOR UPDATE;

    SELECT amount, filled_amount INTO v_sell_amount, v_sell_filled
    FROM orders WHERE id = p_sell_order_id FOR UPDATE;

    v_buy_filled := COALESCE(v_buy_filled, 0) + p_base_amount;
    v_sell_filled := COALESCE(v_sell_filled, 0) + p_base_amount;

    UPDATE orders
    SET filled_amount = ROUND(v_buy_filled, 8),
        status = CASE
            WHEN ROUND(v_buy_filled, 8) >= ROUND(amount, 8) THEN 'filled'
            ELSE 'partially_filled'
        END,
        filled_at = CASE WHEN ROUND(v_buy_filled, 8) >= ROUND(amount, 8) THEN NOW() ELSE filled_at END,
        updated_at = NOW()
    WHERE id = p_buy_order_id;

    UPDATE orders
    SET filled_amount = ROUND(v_sell_filled, 8),
        status = CASE
            WHEN ROUND(v_sell_filled, 8) >= ROUND(amount, 8) THEN 'filled'
            ELSE 'partially_filled'
        END,
        filled_at = CASE WHEN ROUND(v_sell_filled, 8) >= ROUND(amount, 8) THEN NOW() ELSE filled_at END,
        updated_at = NOW()
    WHERE id = p_sell_order_id;

    -- 6) Audit logs
    INSERT INTO trading_audit_log (user_id, order_id, event_type, payload)
    VALUES (
        p_buyer_id,
        p_buy_order_id,
        'TRADE_EXECUTED_BUYER',
        jsonb_build_object(
            'trade_id', v_trade_id,
            'base_amount', p_base_amount,
            'quote_amount', p_quote_amount,
            'execution_price', CASE WHEN p_base_amount > 0 THEN p_quote_amount / p_base_amount ELSE 0 END,
            'order_price', v_buy_price,
            'fee', p_buyer_fee,
            'reserved_for_fill', v_reserved_for_this_fill,
            'actual_used', v_actual_used,
            'refunded', v_refund_amount,
            'locked_before', v_buyer_locked_before,
            'locked_after', v_buyer_locked_after
        )
    );

    INSERT INTO trading_audit_log (user_id, order_id, event_type, payload)
    VALUES (
        p_seller_id,
        p_sell_order_id,
        'TRADE_EXECUTED_SELLER',
        jsonb_build_object(
            'trade_id', v_trade_id,
            'base_amount', p_base_amount,
            'quote_amount', p_quote_amount,
            'execution_price', CASE WHEN p_base_amount > 0 THEN p_quote_amount / p_base_amount ELSE 0 END,
            'fee', p_seller_fee
        )
    );

    RETURN v_trade_id;
END;
$function$;