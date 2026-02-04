-- Fix BSK price in market_prices to $0.012 (the official BSK rate)
UPDATE market_prices SET current_price = 0.012 WHERE symbol = 'BSK/USDT';