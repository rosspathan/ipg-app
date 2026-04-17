-- Fix critical matching engine bug: trading_balance_ledger unique index was too narrow.
-- 
-- The execute_trade function inserts 4 ledger rows per trade:
--   buyer_id × {quote_asset, base_asset}  with entry_type='TRADE_FILL'
--   seller_id × {base_asset, quote_asset} with entry_type='TRADE_FILL'
-- 
-- The previous unique index only covered (reference_type, reference_id, entry_type, user_id),
-- which forces a collision between the buyer's quote-leg and base-leg rows
-- (same trade_id, same user, same entry_type, different asset).
-- 
-- This caused EVERY trade execution to fail with:
--   "duplicate key value violates unique constraint uniq_trading_balance_ledger_ref_v2"
-- 
-- Result: a crossed order book (best bid 0.026 > best ask 0.020 on BSK/USDT)
-- because the matcher detected the cross and called execute_trade, but the
-- transaction always rolled back on the second ledger insert.
-- 
-- Fix: include asset_symbol in the unique key so each (trade, user, entry, asset) tuple is unique.
-- This preserves idempotency (a retry of the same trade still cannot insert duplicate
-- per-asset legs) while allowing all 4 legitimate legs of a trade to be recorded.

DROP INDEX IF EXISTS public.uniq_trading_balance_ledger_ref_v2;

CREATE UNIQUE INDEX uniq_trading_balance_ledger_ref_v3
  ON public.trading_balance_ledger (reference_type, reference_id, entry_type, user_id, asset_symbol)
  WHERE reference_id IS NOT NULL;

-- After this index is in place, re-run the matcher to clear the crossed book.
-- We invoke match-orders for BSK/USDT explicitly via a NOTIFY-style ping; the
-- next scheduled match-orders run (or any new place-order call) will sweep
-- the existing crossed orders within seconds.
