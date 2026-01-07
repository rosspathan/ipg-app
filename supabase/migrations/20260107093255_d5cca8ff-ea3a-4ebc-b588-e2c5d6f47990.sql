-- Update admin fee wallet address
UPDATE trading_engine_settings 
SET admin_fee_wallet = '0x68e5bbd91c9b3bc74cbe47f649c6c58bd6aaae33',
    updated_at = NOW();

-- Add tx_hash and transferred_at columns to trading_fees_collected if not exists
ALTER TABLE trading_fees_collected 
ADD COLUMN IF NOT EXISTS tx_hash TEXT,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;