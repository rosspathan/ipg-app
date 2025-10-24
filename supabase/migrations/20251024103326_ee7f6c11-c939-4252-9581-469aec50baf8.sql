-- Create retroactive processing log table
CREATE TABLE IF NOT EXISTS retroactive_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL,
  purchase_id UUID REFERENCES badge_purchases(id),
  processing_type TEXT NOT NULL, -- 'team_income' | 'vip_milestone'
  commissions_created INTEGER DEFAULT 0,
  bsk_distributed NUMERIC DEFAULT 0,
  status TEXT NOT NULL, -- 'success' | 'failed' | 'skipped'
  error_message TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_retroactive_log_batch ON retroactive_processing_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_retroactive_log_status ON retroactive_processing_log(status);
CREATE INDEX IF NOT EXISTS idx_retroactive_log_processed ON retroactive_processing_log(processed_at DESC);

-- Add RLS
ALTER TABLE retroactive_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view retroactive logs"
ON retroactive_processing_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

COMMENT ON TABLE retroactive_processing_log IS 'Tracks retroactive reward processing for audit purposes';

-- Create commission performance indexes
CREATE INDEX IF NOT EXISTS idx_referral_commissions_earner_created 
ON referral_commissions(earner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_type_date 
ON referral_commissions(commission_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_referral_commissions_payer_type 
ON referral_commissions(payer_id, commission_type);

CREATE INDEX IF NOT EXISTS idx_user_badge_holdings_badge 
ON user_badge_holdings(current_badge, user_id);

CREATE INDEX IF NOT EXISTS idx_referral_tree_ancestor_level 
ON referral_tree(ancestor_id, level);