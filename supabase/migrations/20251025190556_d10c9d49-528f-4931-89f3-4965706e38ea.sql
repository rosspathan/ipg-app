-- Add unique constraint to market_prices.market_id to fix the fetch-crypto-prices upsert error
-- This allows proper upserting of market prices by market_id

ALTER TABLE public.market_prices
ADD CONSTRAINT market_prices_market_id_unique UNIQUE (market_id);