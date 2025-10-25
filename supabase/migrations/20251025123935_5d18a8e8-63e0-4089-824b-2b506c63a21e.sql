-- Set initial prices for USDT and IPG to show in portfolio balance
UPDATE assets 
SET initial_price = 1.00
WHERE symbol = 'USDT' AND network = 'BEP20';

UPDATE assets 
SET initial_price = 0.10
WHERE symbol = 'IPG' AND network = 'BEP20';