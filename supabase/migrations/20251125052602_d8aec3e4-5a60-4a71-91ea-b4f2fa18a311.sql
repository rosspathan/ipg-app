-- Disable the faulty trigger that's interfering with commission processing
-- This trigger only calls L1 commission unreliably and never calls L2-L50
ALTER TABLE public.user_badge_holdings 
DISABLE TRIGGER after_badge_purchase_commission;

-- Add comment explaining why it's disabled
COMMENT ON TRIGGER after_badge_purchase_commission ON public.user_badge_holdings IS 
'DISABLED: This trigger interferes with proper commission processing. 
It only calls L1 commission via unreliable HTTP and never processes L2-L50 multi-level commissions. 
Badge purchase flow now handled entirely by badge-purchase edge function which calls all processors correctly.';