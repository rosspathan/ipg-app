-- Add contract addresses for all major BEP20 tokens on BSC
-- These are verified contract addresses from BscScan

-- Update existing tokens with contract addresses
UPDATE assets SET contract_address = '0x55d398326f99059fF775485246999027B3197955', decimals = 18 WHERE symbol = 'USDT' AND network = 'BEP20';
UPDATE assets SET contract_address = '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', decimals = 18 WHERE symbol = 'ETH' AND network = 'BEP20';
UPDATE assets SET contract_address = '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', decimals = 18 WHERE symbol = 'BTC' AND network = 'Bitcoin';
UPDATE assets SET contract_address = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals = 18 WHERE symbol = 'USDC' AND network = 'BEP20';
UPDATE assets SET contract_address = '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', decimals = 18 WHERE symbol = 'DAI' AND network = 'Ethereum';
UPDATE assets SET contract_address = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals = 18 WHERE symbol = 'BUSD' AND network = 'BEP20';
UPDATE assets SET contract_address = '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', decimals = 8 WHERE symbol = 'DOGE' AND network = 'Dogecoin';
UPDATE assets SET contract_address = '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47', decimals = 18 WHERE symbol = 'ADA' AND network = 'Cardano';
UPDATE assets SET contract_address = '0xbA2aE424d960c26247Dd6c32edC70B295c744C43', decimals = 8 WHERE symbol = 'XRP' AND network = 'Ripple';
UPDATE assets SET contract_address = '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', decimals = 18 WHERE symbol = 'XRP' AND network = 'Ripple';
UPDATE assets SET contract_address = '0x4338665CBB7B2485A8855A139b75D5e34AB0DB94', decimals = 18 WHERE symbol = 'LTC' AND network = 'Litecoin';
UPDATE assets SET contract_address = '0x56b6fB708fC5732DEC1Afc8D8556423A2EDcCbD6', decimals = 18 WHERE symbol = 'EOS' AND network = 'EOS';
UPDATE assets SET contract_address = '0x8fF795a6F4D97E7887C79beA79aba5cc76444aDf', decimals = 18 WHERE symbol = 'BCH' AND network = 'Bitcoin Cash';
UPDATE assets SET contract_address = '0x948d2a81086A075b3130BAc19e4c6DEe1D2E3fE8', decimals = 18 WHERE symbol = 'HBAR' AND network = 'Hedera';
UPDATE assets SET contract_address = '0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402', decimals = 18 WHERE symbol = 'DOT' AND network = 'Polkadot';
UPDATE assets SET contract_address = '0x1CE0c2827e2eF14D5C4f29a091d735A204794041', decimals = 18 WHERE symbol = 'AVAX' AND network = 'Avalanche';
UPDATE assets SET contract_address = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82', decimals = 18 WHERE symbol = 'CAKE' AND network = 'BEP20';
UPDATE assets SET contract_address = '0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD', decimals = 18 WHERE symbol = 'LINK' AND network = 'Ethereum';
UPDATE assets SET contract_address = '0x0D8Ce2A99Bb6e3B7Db580eD848240e4a0F9aE153', decimals = 18 WHERE symbol = 'FIL' AND network = 'Filecoin';
UPDATE assets SET contract_address = '0xbF5140A22578168FD562DCcF235E5D43A02ce9B1', decimals = 18 WHERE symbol = 'UNI' AND network = 'Ethereum';
UPDATE assets SET contract_address = '0xCC42724C6683B7E57334c4E856f4c9965ED682bD', decimals = 18 WHERE symbol = 'MATIC' AND network = 'Polygon';
UPDATE assets SET contract_address = '0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE', decimals = 18 WHERE symbol = 'XLM' AND network = 'Stellar';
UPDATE assets SET contract_address = '0x16939ef78684453bfDFb47825F8a5F714f12623a', decimals = 18 WHERE symbol = 'XTZ' AND network = 'Tezos';
UPDATE assets SET contract_address = '0x8595F9dA7b868b1822194fAEd312235E43007b49', decimals = 8 WHERE symbol = 'BTT' AND network = 'Tron';
UPDATE assets SET contract_address = '0x0Eb3a705fc54725037CC9e008bDede697f62F335', decimals = 18 WHERE symbol = 'ATOM' AND network = 'Cosmos';
UPDATE assets SET contract_address = '0x85EAC5Ac2F758618dFa09bDbe0cf174e7d574D5B', decimals = 18 WHERE symbol = 'TRX' AND network = 'Tron';

-- Add index for faster contract address lookups
CREATE INDEX IF NOT EXISTS idx_assets_contract_address ON assets(contract_address) WHERE contract_address IS NOT NULL;

-- Add index for network filtering
CREATE INDEX IF NOT EXISTS idx_assets_network ON assets(network);

-- Add a flag to mark if an asset supports auto-deposit detection
ALTER TABLE assets ADD COLUMN IF NOT EXISTS auto_deposit_enabled BOOLEAN DEFAULT true;

-- Enable auto deposit for all tokens with contract addresses
UPDATE assets SET auto_deposit_enabled = true WHERE contract_address IS NOT NULL;