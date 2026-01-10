-- Update execute_trade function to credit fees to platform account
CREATE OR REPLACE FUNCTION public.execute_trade(
    p_buy_order_id UUID,
    p_sell_order_id UUID,
    p_buyer_id UUID,
    p_seller_id UUID,
    p_symbol TEXT,
    p_base_asset TEXT,
    p_quote_asset TEXT,
    p_base_amount NUMERIC,
    p_quote_amount NUMERIC,
    p_buyer_fee NUMERIC,
    p_seller_fee NUMERIC,
    p_trading_type TEXT DEFAULT 'spot'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_base_asset_id UUID;
    v_quote_asset_id UUID;
    v_buyer_base_locked NUMERIC;
    v_buyer_quote_locked NUMERIC;
    v_seller_base_locked NUMERIC;
    v_seller_quote_locked NUMERIC;
    v_buyer_quote_required NUMERIC;
    v_seller_base_required NUMERIC;
    v_trade_id UUID;
    v_buy_filled NUMERIC;
    v_sell_filled NUMERIC;
    v_buy_amount NUMERIC;
    v_sell_amount NUMERIC;
    v_total_fees NUMERIC;
    v_platform_account_id UUID := '00000000-0000-0000-0000-000000000001';
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
    
    -- Calculate required amounts
    v_buyer_quote_required := p_quote_amount + p_buyer_fee;
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
    
    -- Validate locked balances
    IF COALESCE(v_buyer_quote_locked, 0) < v_buyer_quote_required THEN
        RAISE EXCEPTION 'Insufficient buyer locked balance: has %, needs %', 
            COALESCE(v_buyer_quote_locked, 0), v_buyer_quote_required;
    END IF;
    
    IF COALESCE(v_seller_base_locked, 0) < v_seller_base_required THEN
        RAISE EXCEPTION 'Insufficient seller locked balance: has %, needs %', 
            COALESCE(v_seller_base_locked, 0), v_seller_base_required;
    END IF;
    
    -- 1. Transfer quote from buyer locked to seller available (minus fee)
    UPDATE wallet_balances
    SET locked = GREATEST(locked - v_buyer_quote_required, 0),
        updated_at = NOW()
    WHERE user_id = p_buyer_id AND asset_id = v_quote_asset_id;
    
    -- Credit seller with quote amount minus seller fee
    INSERT INTO wallet_balances (user_id, asset_id, available, locked)
    VALUES (p_seller_id, v_quote_asset_id, p_quote_amount - p_seller_fee, 0)
    ON CONFLICT (user_id, asset_id) 
    DO UPDATE SET 
        available = wallet_balances.available + (p_quote_amount - p_seller_fee),
        updated_at = NOW();
    
    -- 2. Transfer base from seller locked to buyer available
    UPDATE wallet_balances
    SET locked = GREATEST(locked - v_seller_base_required, 0),
        updated_at = NOW()
    WHERE user_id = p_seller_id AND asset_id = v_base_asset_id;
    
    -- Credit buyer with base amount
    INSERT INTO wallet_balances (user_id, asset_id, available, locked)
    VALUES (p_buyer_id, v_base_asset_id, p_base_amount, 0)
    ON CONFLICT (user_id, asset_id) 
    DO UPDATE SET 
        available = wallet_balances.available + p_base_amount,
        updated_at = NOW();
    
    -- 3. Credit trading fees to platform account
    IF v_total_fees > 0 THEN
        INSERT INTO wallet_balances (user_id, asset_id, available, locked)
        VALUES (v_platform_account_id, v_quote_asset_id, v_total_fees, 0)
        ON CONFLICT (user_id, asset_id) 
        DO UPDATE SET 
            available = wallet_balances.available + v_total_fees,
            updated_at = NOW();
    END IF;
    
    -- 4. Create trade record
    INSERT INTO trades (
        buy_order_id, sell_order_id, buyer_id, seller_id,
        symbol, quantity, price, total_value,
        buyer_fee, seller_fee, fee_asset, trading_type
    ) VALUES (
        p_buy_order_id, p_sell_order_id, p_buyer_id, p_seller_id,
        p_symbol, p_base_amount, 
        CASE WHEN p_base_amount > 0 THEN p_quote_amount / p_base_amount ELSE 0 END,
        p_quote_amount,
        p_buyer_fee, p_seller_fee, p_quote_asset, p_trading_type
    ) RETURNING id INTO v_trade_id;
    
    -- 5. Update order filled amounts and statuses
    SELECT amount, filled_amount INTO v_buy_amount, v_buy_filled
    FROM orders WHERE id = p_buy_order_id;
    
    SELECT amount, filled_amount INTO v_sell_amount, v_sell_filled
    FROM orders WHERE id = p_sell_order_id;
    
    -- Update buy order
    UPDATE orders
    SET filled_amount = filled_amount + p_base_amount,
        status = CASE 
            WHEN (v_buy_filled + p_base_amount) >= v_buy_amount THEN 'filled'
            ELSE 'partially_filled'
        END,
        updated_at = NOW()
    WHERE id = p_buy_order_id;
    
    -- Update sell order
    UPDATE orders
    SET filled_amount = filled_amount + p_base_amount,
        status = CASE 
            WHEN (v_sell_filled + p_base_amount) >= v_sell_amount THEN 'filled'
            ELSE 'partially_filled'
        END,
        updated_at = NOW()
    WHERE id = p_sell_order_id;
    
    RETURN v_trade_id;
END;
$$;