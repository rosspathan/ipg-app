-- Swap USDI/IPG to IPG/USDI
-- IPG asset ID: e4ce7e45-5215-4a84-8189-3139f55c8983
-- USDI asset ID: 62e5491b-abcb-4d3d-9ba5-42f1104fd457

UPDATE markets
SET 
  base_asset_id = 'e4ce7e45-5215-4a84-8189-3139f55c8983',  -- IPG becomes base
  quote_asset_id = '62e5491b-abcb-4d3d-9ba5-42f1104fd457', -- USDI becomes quote
  updated_at = now()
WHERE id = 'bbfa3203-d0d4-4b32-a36e-774e0bd68d59';