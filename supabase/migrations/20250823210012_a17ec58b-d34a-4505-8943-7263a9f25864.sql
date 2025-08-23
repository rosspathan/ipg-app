-- Insert some sample markets to demonstrate the system
-- First, let's get the asset IDs for BTC, ETH, USDT, BNB
DO $$
DECLARE
    btc_id uuid;
    eth_id uuid;
    usdt_id uuid;
    bnb_id uuid;
BEGIN
    -- Get asset IDs
    SELECT id INTO btc_id FROM public.assets WHERE symbol = 'BTC' LIMIT 1;
    SELECT id INTO eth_id FROM public.assets WHERE symbol = 'ETH' LIMIT 1;
    SELECT id INTO usdt_id FROM public.assets WHERE symbol = 'USDT' LIMIT 1;
    SELECT id INTO bnb_id FROM public.assets WHERE symbol = 'BNB' LIMIT 1;
    
    -- Only insert if all assets exist
    IF btc_id IS NOT NULL AND usdt_id IS NOT NULL THEN
        INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
        VALUES (btc_id, usdt_id, 0.01, 0.001, 10, true)
        ON CONFLICT (base_asset_id, quote_asset_id) DO NOTHING;
    END IF;
    
    IF eth_id IS NOT NULL AND usdt_id IS NOT NULL THEN
        INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
        VALUES (eth_id, usdt_id, 0.01, 0.001, 5, true)
        ON CONFLICT (base_asset_id, quote_asset_id) DO NOTHING;
    END IF;
    
    IF bnb_id IS NOT NULL AND usdt_id IS NOT NULL THEN
        INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
        VALUES (bnb_id, usdt_id, 0.01, 0.001, 5, true)
        ON CONFLICT (base_asset_id, quote_asset_id) DO NOTHING;
    END IF;
    
    IF btc_id IS NOT NULL AND eth_id IS NOT NULL THEN
        INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
        VALUES (btc_id, eth_id, 0.001, 0.001, 0.01, true)
        ON CONFLICT (base_asset_id, quote_asset_id) DO NOTHING;
    END IF;
END $$;