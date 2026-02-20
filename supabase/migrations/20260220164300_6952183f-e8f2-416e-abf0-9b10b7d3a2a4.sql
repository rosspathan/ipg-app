-- Lower minimum order sizes to be practical for users
-- IPG/USDT: 1 IPG costs ~620 USDT, so min of 1 blocks most users
-- BSK/USDT: similarly needs a lower min
-- Set to 0.0001 for all crypto pairs to allow micro trades

UPDATE trading_pair_settings 
SET min_order_size = 0.0001
WHERE symbol IN ('IPG/USDT', 'IPG/USDI', 'BSK/USDT', 'BSK/USDI');