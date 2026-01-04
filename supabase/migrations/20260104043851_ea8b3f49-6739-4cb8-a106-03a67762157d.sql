-- Enable realtime for trading tables
ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE trades REPLICA IDENTITY FULL;
ALTER TABLE wallet_balances REPLICA IDENTITY FULL;

-- Add trading tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;