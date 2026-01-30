-- Add BSK/IPG and USDI/IPG to the markets table (used by the trading UI)
INSERT INTO public.markets (
  base_asset_id,
  quote_asset_id,
  tick_size,
  lot_size,
  min_notional,
  is_active
) VALUES 
  (
    '3a57be42-ab49-4813-9922-517cb0b5a011', -- BSK
    'e4ce7e45-5215-4a84-8189-3139f55c8983', -- IPG
    0.00000001,
    0.00000001,
    0.0001,
    true
  ),
  (
    '62e5491b-abcb-4d3d-9ba5-42f1104fd457', -- USDI
    'e4ce7e45-5215-4a84-8189-3139f55c8983', -- IPG
    0.00000001,
    0.00000001,
    0.0001,
    true
  )
ON CONFLICT (base_asset_id, quote_asset_id) DO UPDATE SET
  is_active = true,
  updated_at = now();