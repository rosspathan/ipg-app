-- =====================================================
-- FIX EXISTING BALANCE DATA BEFORE ADDING CONSTRAINTS
-- =====================================================

-- Fix any balances where current > total_earned
UPDATE user_bsk_balances
SET 
  total_earned_holding = GREATEST(total_earned_holding, holding_balance),
  total_earned_withdrawable = GREATEST(total_earned_withdrawable, withdrawable_balance)
WHERE holding_balance > total_earned_holding 
   OR withdrawable_balance > total_earned_withdrawable;

-- Now add the data integrity constraints
-- =====================================================
-- 1. REFERRAL TREE INTEGRITY
-- =====================================================

CREATE OR REPLACE FUNCTION public.check_level1_sponsor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.level = 1 AND NEW.ancestor_id != NEW.direct_sponsor_id THEN
    RAISE EXCEPTION 'Level 1 ancestor_id (%) must match direct_sponsor_id (%)', 
      NEW.ancestor_id, NEW.direct_sponsor_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_level1_sponsor ON referral_tree;
CREATE TRIGGER enforce_level1_sponsor
  BEFORE INSERT OR UPDATE ON referral_tree
  FOR EACH ROW 
  EXECUTE FUNCTION public.check_level1_sponsor();

-- =====================================================
-- 2. PREVENT DUPLICATE SIGNUP COMMISSIONS
-- =====================================================

DROP INDEX IF EXISTS unique_signup_commission;
CREATE UNIQUE INDEX unique_signup_commission 
ON referral_commissions (payer_id, earner_id, level)
WHERE event_type = 'signup';

-- =====================================================
-- 3. BALANCE CONSISTENCY CHECKS
-- =====================================================

ALTER TABLE user_bsk_balances
DROP CONSTRAINT IF EXISTS check_balance_consistency;

ALTER TABLE user_bsk_balances
ADD CONSTRAINT check_balance_consistency
CHECK (
  holding_balance <= total_earned_holding AND
  withdrawable_balance <= total_earned_withdrawable AND
  holding_balance >= 0 AND
  withdrawable_balance >= 0 AND
  total_earned_holding >= 0 AND
  total_earned_withdrawable >= 0
);

-- =====================================================
-- 4. REFERRAL LINK INTEGRITY
-- =====================================================

CREATE OR REPLACE FUNCTION public.prevent_self_referral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = NEW.sponsor_id THEN
    RAISE EXCEPTION 'User cannot be their own sponsor';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_self_referral ON referral_links_new;
CREATE TRIGGER check_self_referral
  BEFORE INSERT OR UPDATE ON referral_links_new
  FOR EACH ROW 
  WHEN (NEW.sponsor_id IS NOT NULL)
  EXECUTE FUNCTION public.prevent_self_referral();

-- =====================================================
-- 5. COMMISSION AMOUNT VALIDATION
-- =====================================================

ALTER TABLE referral_commissions
DROP CONSTRAINT IF EXISTS check_commission_amount_positive;

ALTER TABLE referral_commissions
ADD CONSTRAINT check_commission_amount_positive
CHECK (bsk_amount > 0);