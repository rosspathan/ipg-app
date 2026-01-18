-- Enable realtime for crypto_internal_transfers table
-- This allows both sender AND receiver to see transfers instantly
ALTER PUBLICATION supabase_realtime ADD TABLE crypto_internal_transfers;