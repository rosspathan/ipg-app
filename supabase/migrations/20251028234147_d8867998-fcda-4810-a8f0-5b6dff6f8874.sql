-- One-time correction: Reset locked balance to 0 for the user's IPG asset
UPDATE wallet_balances 
SET locked = 0, updated_at = now() 
WHERE user_id = '364415f7-fa4b-42ff-b416-8eab8e4402c4' 
  AND asset_id = 'e4ce7e45-5215-4a84-8189-3139f55c8983';