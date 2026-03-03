DO $$
DECLARE
  bsk_id UUID := '3a57be42-ab49-4813-9922-517cb0b5a011';
  usdt_id UUID := 'ddee3f1f-3542-4c5e-870d-8ccf6ec8bbd0';
BEGIN
  -- Reverse trade 0693f421: buyer 4eae65cd, qty 0.16319200 BSK at wrong price 0.01
  UPDATE wallet_balances SET available = available + 0.00164007
  WHERE user_id = '4eae65cd-2d9e-4b42-86e2-b3b7ea43fc45' AND asset_id = usdt_id;
  UPDATE wallet_balances SET available = available - 0.16319200
  WHERE user_id = '4eae65cd-2d9e-4b42-86e2-b3b7ea43fc45' AND asset_id = bsk_id;

  -- Reverse trade fe6d5e19: buyer 36a55640, qty 9.83680800 BSK at wrong price 0.01
  UPDATE wallet_balances SET available = available + 0.09885992
  WHERE user_id = '36a55640-da73-43a5-a544-93e5ec504e7c' AND asset_id = usdt_id;
  UPDATE wallet_balances SET available = available - 9.83680800
  WHERE user_id = '36a55640-da73-43a5-a544-93e5ec504e7c' AND asset_id = bsk_id;

  -- Reverse seller da546ee5: return 10 BSK, take back 0.09950001 USDT
  UPDATE wallet_balances SET available = available + 10.00000000
  WHERE user_id = 'da546ee5-d918-42df-9255-dcd8c83b08c9' AND asset_id = bsk_id;
  UPDATE wallet_balances SET available = available - 0.09950001
  WHERE user_id = 'da546ee5-d918-42df-9255-dcd8c83b08c9' AND asset_id = usdt_id;

  -- Delete the mispriced trades
  DELETE FROM trades WHERE id IN (
    'fe6d5e19-884d-401b-ba47-15de0cbc0552',
    '0693f421-434d-4a5f-bc71-42ef504c2031'
  );
END $$;