-- Add commission_type column to referral_commissions table
ALTER TABLE public.referral_commissions 
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'direct_commission';

ALTER TABLE public.referral_commissions 
DROP CONSTRAINT IF EXISTS check_commission_type;

ALTER TABLE public.referral_commissions 
ADD CONSTRAINT check_commission_type 
CHECK (commission_type IN ('direct_commission', 'team_income', 'vip_milestone'));

CREATE INDEX IF NOT EXISTS idx_referral_commissions_type 
ON public.referral_commissions(commission_type, earner_id);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_event 
ON public.referral_commissions(event_type, payer_id);

UPDATE public.referral_commissions 
SET commission_type = 'direct_commission' 
WHERE commission_type IS NULL;

COMMENT ON COLUMN public.referral_commissions.commission_type IS 
'Type of commission: direct_commission (10% of badge purchase), team_income (fixed BSK per level), vip_milestone (bonus for VIP referral milestones)';