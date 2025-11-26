-- Drop existing view
DROP VIEW IF EXISTS public.unified_bsk_transactions;

-- Create comprehensive unified_bsk_transactions view from unified_bsk_ledger
CREATE OR REPLACE VIEW public.unified_bsk_transactions AS
SELECT 
  l.id,
  l.user_id,
  l.created_at,
  l.amount_bsk as amount,
  l.balance_type,
  l.tx_type as transaction_type,
  l.tx_subtype as transaction_subtype,
  
  -- Calculate balance_after by getting current balance from user_bsk_balances
  CASE 
    WHEN l.balance_type = 'withdrawable' THEN (
      SELECT withdrawable_balance FROM user_bsk_balances WHERE user_id = l.user_id
    )
    WHEN l.balance_type = 'holding' THEN (
      SELECT holding_balance FROM user_bsk_balances WHERE user_id = l.user_id
    )
    ELSE 0
  END as balance_after,
  
  -- Extract meaningful descriptions based on transaction type
  CASE 
    -- L1-L50 Referral Income
    WHEN l.tx_subtype = 'l1_commission' THEN 'Level 1 Referral Income'
    WHEN l.tx_subtype = 'l2_commission' THEN 'Level 2 Referral Income'
    WHEN l.tx_subtype = 'l3_commission' THEN 'Level 3 Referral Income'
    WHEN l.tx_subtype = 'l4_commission' THEN 'Level 4 Referral Income'
    WHEN l.tx_subtype = 'l5_commission' THEN 'Level 5 Referral Income'
    WHEN l.tx_subtype = 'l6_commission' THEN 'Level 6 Referral Income'
    WHEN l.tx_subtype = 'l7_commission' THEN 'Level 7 Referral Income'
    WHEN l.tx_subtype = 'l8_commission' THEN 'Level 8 Referral Income'
    WHEN l.tx_subtype = 'l9_commission' THEN 'Level 9 Referral Income'
    WHEN l.tx_subtype = 'l10_commission' THEN 'Level 10 Referral Income'
    WHEN l.tx_subtype LIKE 'l%_commission' THEN CONCAT('Level ', SUBSTRING(l.tx_subtype FROM 2 FOR POSITION('_' IN SUBSTRING(l.tx_subtype FROM 2)) - 1), ' Referral Income')
    
    -- VIP Milestones
    WHEN l.tx_subtype = 'vip_milestone_reward' THEN 'VIP Milestone Reward'
    WHEN l.tx_subtype = 'team_building_bonus' THEN 'Team Building Bonus'
    
    -- Ad Mining
    WHEN l.tx_subtype = 'ad_watch_reward' THEN 'Ad Watch Reward'
    WHEN l.tx_subtype = 'subscription_daily_mining' THEN 'Daily Mining Reward'
    
    -- Purchases & Transfers
    WHEN l.tx_subtype = 'purchase_bonus' THEN 'Purchase Bonus'
    WHEN l.tx_subtype = 'badge_purchase' THEN 'Badge Purchase'
    WHEN l.tx_subtype = 'transfer_out' THEN 'Transfer Out'
    WHEN l.tx_subtype = 'transfer_in' THEN 'Transfer In'
    
    -- Admin operations
    WHEN l.tx_subtype = 'admin_credit' THEN 'Admin Credit'
    WHEN l.tx_subtype = 'admin_debit' THEN 'Admin Debit'
    WHEN l.tx_subtype = 'admin_adjustment' THEN 'Admin Adjustment'
    
    -- Vesting
    WHEN l.tx_subtype = 'vesting_release' THEN 'Vesting Release'
    
    -- Default fallback
    ELSE INITCAP(REPLACE(COALESCE(l.tx_subtype, l.tx_type), '_', ' '))
  END as description,
  
  -- Extract sender/recipient information from metadata
  CASE 
    WHEN l.tx_type = 'credit' AND l.meta_json->>'from_user_id' IS NOT NULL 
      THEN (SELECT full_name FROM profiles WHERE user_id::text = l.meta_json->>'from_user_id')
    WHEN l.tx_type = 'debit' AND l.meta_json->>'to_user_id' IS NOT NULL 
      THEN (SELECT full_name FROM profiles WHERE user_id::text = l.meta_json->>'to_user_id')
    WHEN l.meta_json->>'referee_name' IS NOT NULL THEN l.meta_json->>'referee_name'
    WHEN l.meta_json->>'referrer_name' IS NOT NULL THEN l.meta_json->>'referrer_name'
    WHEN l.related_user_id IS NOT NULL THEN (SELECT full_name FROM profiles WHERE user_id = l.related_user_id)
    ELSE NULL
  END as sender_recipient,
  
  -- Transaction ID for tracking
  COALESCE(
    l.meta_json->>'reference_id',
    l.meta_json->>'transaction_id',
    l.meta_json->>'transfer_id',
    l.id::text
  ) as transaction_id,
  
  -- Full metadata for detail views
  l.meta_json as metadata,
  
  -- Notes field
  l.notes,
  
  -- Determine if this is income or expense
  CASE 
    WHEN l.tx_type = 'credit' THEN true
    ELSE false
  END as is_credit

FROM public.unified_bsk_ledger l
ORDER BY l.created_at DESC;