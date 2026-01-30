-- Add BSK/IPG and USDI/IPG trading pairs
INSERT INTO public.trading_pairs (
  base_asset_id,
  quote_asset_id,
  symbol,
  tick_size,
  lot_size,
  min_price,
  max_price,
  maker_fee,
  taker_fee,
  active
) VALUES 
  (
    '3a57be42-ab49-4813-9922-517cb0b5a011', -- BSK
    'e4ce7e45-5215-4a84-8189-3139f55c8983', -- IPG
    'BSK/IPG',
    0.00000001,
    0.00000001,
    0.00000001,
    999999999,
    0.001,
    0.001,
    true
  ),
  (
    '62e5491b-abcb-4d3d-9ba5-42f1104fd457', -- USDI
    'e4ce7e45-5215-4a84-8189-3139f55c8983', -- IPG
    'USDI/IPG',
    0.00000001,
    0.00000001,
    0.00000001,
    999999999,
    0.001,
    0.001,
    true
  )
ON CONFLICT (symbol) DO UPDATE SET
  active = true,
  updated_at = now();