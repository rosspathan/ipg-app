-- 1) Register SSS asset (BEP-20)
INSERT INTO public.assets (
  symbol, name, network, contract_address, decimals,
  is_active, asset_type, deposit_enabled, withdraw_enabled, trading_enabled,
  auto_deposit_enabled, initial_price, price_currency,
  min_trade_amount, min_withdraw_amount, withdraw_fee, risk_label
) VALUES (
  'SSS', 'Success Coin', 'BEP20', '0x639AEC775CE4a3de0b92F6613081223b60D09056', 18,
  true, 'crypto', true, true, true,
  true, 0.0001, 'USD',
  1, 1, 0, 'medium'
)
ON CONFLICT DO NOTHING;

-- 2) Create SSS/USDT market with price-tuned precision
INSERT INTO public.markets (base_asset_id, quote_asset_id, tick_size, lot_size, min_notional, is_active)
SELECT b.id, q.id, 0.00000001, 1, 1, true
FROM public.assets b, public.assets q
WHERE b.symbol = 'SSS' AND q.symbol = 'USDT'
  AND NOT EXISTS (
    SELECT 1 FROM public.markets m
    WHERE m.base_asset_id = b.id AND m.quote_asset_id = q.id
  );

-- 3) Seed initial market price so UI shows 0.0001 immediately
INSERT INTO public.market_prices (
  market_id, symbol, current_price, price_change_24h, price_change_percentage_24h,
  high_24h, low_24h, volume_24h, last_updated
)
SELECT m.id, 'SSS/USDT', 0.0001, 0, 0, 0.0001, 0.0001, 0, now()
FROM public.markets m
JOIN public.assets b ON b.id = m.base_asset_id AND b.symbol = 'SSS'
JOIN public.assets q ON q.id = m.quote_asset_id AND q.symbol = 'USDT'
WHERE NOT EXISTS (
  SELECT 1 FROM public.market_prices mp WHERE mp.market_id = m.id
);