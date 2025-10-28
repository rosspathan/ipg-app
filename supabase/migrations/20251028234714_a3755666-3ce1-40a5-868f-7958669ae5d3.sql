-- Add native BNB as a separate asset (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM assets WHERE symbol = 'BNB' AND network = 'BNB'
  ) THEN
    INSERT INTO assets (
      symbol, 
      name, 
      network, 
      decimals, 
      is_active, 
      withdraw_enabled,
      deposit_enabled,
      contract_address,
      logo_url,
      initial_price,
      withdraw_fee
    ) VALUES (
      'BNB',
      'Binance Coin',
      'BNB',
      18,
      true,
      true,
      true,
      NULL,
      'https://cryptologos.cc/logos/bnb-bnb-logo.png',
      600,
      0.0005
    );
  END IF;
END $$;

-- Update BNB ORIGINAL to be more clear it's a BEP20 token
UPDATE assets 
SET 
  name = 'BNB (BEP20)',
  network = 'BEP20'
WHERE symbol = 'BNB ORIGINAL' AND network = 'BSC';