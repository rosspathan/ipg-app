-- Task 1.5: Create 30 Major Trading Pairs

-- Create helper function to add trading pairs
CREATE OR REPLACE FUNCTION create_trading_pair(
  p_base_symbol TEXT,
  p_quote_symbol TEXT,
  p_tick_size NUMERIC DEFAULT 0.01,
  p_lot_size NUMERIC DEFAULT 0.001,
  p_min_notional NUMERIC DEFAULT 10
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_id UUID;
  v_quote_id UUID;
  v_market_id UUID;
  v_market_exists BOOLEAN;
BEGIN
  -- Get asset IDs
  SELECT id INTO v_base_id FROM assets WHERE symbol = p_base_symbol;
  SELECT id INTO v_quote_id FROM assets WHERE symbol = p_quote_symbol;
  
  IF v_base_id IS NULL THEN
    RAISE NOTICE 'Base asset % not found, skipping pair', p_base_symbol;
    RETURN NULL;
  END IF;
  
  IF v_quote_id IS NULL THEN
    RAISE NOTICE 'Quote asset % not found, skipping pair', p_quote_symbol;
    RETURN NULL;
  END IF;
  
  -- Check if market already exists
  SELECT EXISTS(
    SELECT 1 FROM markets 
    WHERE base_asset_id = v_base_id 
    AND quote_asset_id = v_quote_id
  ) INTO v_market_exists;
  
  IF v_market_exists THEN
    RAISE NOTICE 'Market %/% already exists, skipping', p_base_symbol, p_quote_symbol;
    RETURN NULL;
  END IF;
  
  -- Create market
  INSERT INTO markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
  VALUES (v_base_id, v_quote_id, p_tick_size, p_lot_size, p_min_notional, true)
  RETURNING id INTO v_market_id;
  
  RAISE NOTICE 'Created market %/% with ID %', p_base_symbol, p_quote_symbol, v_market_id;
  RETURN v_market_id;
END;
$$ LANGUAGE plpgsql;

-- Create 30 major USDT pairs (skip if assets don't exist)
-- Top 10 cryptocurrencies
SELECT create_trading_pair('BTC', 'USDT', 0.01, 0.00001, 10);
SELECT create_trading_pair('ETH', 'USDT', 0.01, 0.0001, 10);
SELECT create_trading_pair('BNB', 'USDT', 0.01, 0.01, 10);
SELECT create_trading_pair('XRP', 'USDT', 0.0001, 1, 10);
SELECT create_trading_pair('SOL', 'USDT', 0.01, 0.01, 10);
SELECT create_trading_pair('ADA', 'USDT', 0.0001, 1, 10);
SELECT create_trading_pair('DOGE', 'USDT', 0.00001, 10, 10);
SELECT create_trading_pair('MATIC', 'USDT', 0.0001, 1, 10);
SELECT create_trading_pair('DOT', 'USDT', 0.01, 0.1, 10);
SELECT create_trading_pair('LINK', 'USDT', 0.01, 0.1, 10);

-- Next 10 major cryptocurrencies
SELECT create_trading_pair('SHIB', 'USDT', 0.00000001, 100000, 10);
SELECT create_trading_pair('TRX', 'USDT', 0.00001, 10, 10);
SELECT create_trading_pair('UNI', 'USDT', 0.01, 0.1, 10);
SELECT create_trading_pair('LTC', 'USDT', 0.01, 0.01, 10);
SELECT create_trading_pair('AVAX', 'USDT', 0.01, 0.1, 10);
SELECT create_trading_pair('ATOM', 'USDT', 0.01, 0.1, 10);
SELECT create_trading_pair('XLM', 'USDT', 0.0001, 1, 10);
SELECT create_trading_pair('NEAR', 'USDT', 0.01, 0.1, 10);
SELECT create_trading_pair('ALGO', 'USDT', 0.0001, 1, 10);
SELECT create_trading_pair('FIL', 'USDT', 0.01, 0.1, 10);

-- DeFi and emerging altcoins
SELECT create_trading_pair('AAVE', 'USDT', 0.01, 0.01, 10);
SELECT create_trading_pair('GRT', 'USDT', 0.0001, 1, 10);
SELECT create_trading_pair('SAND', 'USDT', 0.0001, 1, 10);
SELECT create_trading_pair('APT', 'USDT', 0.01, 0.1, 10);
SELECT create_trading_pair('ARB', 'USDT', 0.0001, 1, 10);
SELECT create_trading_pair('OP', 'USDT', 0.01, 0.1, 10);
SELECT create_trading_pair('INJ', 'USDT', 0.01, 0.1, 10);
SELECT create_trading_pair('VET', 'USDT', 0.00001, 10, 10);

-- Your native token
SELECT create_trading_pair('IPG', 'USDT', 0.01, 1, 10);

-- Major cross pair (ETH/BTC)
SELECT create_trading_pair('ETH', 'BTC', 0.000001, 0.0001, 0.001);