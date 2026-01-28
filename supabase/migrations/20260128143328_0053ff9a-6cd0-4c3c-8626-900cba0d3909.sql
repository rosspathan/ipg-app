-- Add BSK/USDI market (the app uses markets table, not trading_pairs)
INSERT INTO public.markets (
  base_asset_id,
  quote_asset_id,
  is_active,
  tick_size,
  lot_size,
  min_notional
) VALUES (
  '3a57be42-ab49-4813-9922-517cb0b5a011',  -- BSK
  '62e5491b-abcb-4d3d-9ba5-42f1104fd457',  -- USDI
  true,
  0.00001,
  0.001,
  1
);