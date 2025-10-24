-- Create table to track VIP milestone claims
CREATE TABLE IF NOT EXISTS public.user_vip_milestone_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_id UUID NOT NULL REFERENCES vip_milestones(id) ON DELETE CASCADE,
  vip_count_at_claim INTEGER NOT NULL,
  bsk_rewarded NUMERIC NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, milestone_id)
);

ALTER TABLE public.user_vip_milestone_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestone claims"
ON public.user_vip_milestone_claims FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert milestone claims"
ON public.user_vip_milestone_claims FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all milestone claims"
ON public.user_vip_milestone_claims FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE INDEX idx_milestone_claims_user 
ON public.user_vip_milestone_claims(user_id, claimed_at DESC);

CREATE INDEX idx_milestone_claims_milestone 
ON public.user_vip_milestone_claims(milestone_id, claimed_at DESC);

COMMENT ON TABLE public.user_vip_milestone_claims IS 
'Tracks which VIP milestone rewards have been claimed by users to prevent duplicate payouts';