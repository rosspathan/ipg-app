-- Update existing insurance system for BSK-only plans
-- Add new plan types and update structure

-- Create new plan configurations table that supports the 3 specific plans
CREATE TABLE IF NOT EXISTS insurance_bsk_plan_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL UNIQUE, -- 'accident', 'trading', 'life'
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  premium_inr NUMERIC NOT NULL DEFAULT 10000,
  
  -- Plan-specific settings (JSON for flexibility)
  plan_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create global BSK insurance settings
CREATE TABLE IF NOT EXISTS insurance_bsk_global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_enabled BOOLEAN NOT NULL DEFAULT true,
  region_restrictions JSONB DEFAULT '{"allowed": ["global"]}'::jsonb,
  kyc_required_for_payout BOOLEAN DEFAULT false,
  payout_destination TEXT DEFAULT 'withdrawable',
  refund_window_hours INTEGER DEFAULT 24,
  disclaimer_text TEXT DEFAULT 'This is a promotional, in-app coverage-like program, NOT regulated insurance.',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create BSK insurance policies table
CREATE TABLE IF NOT EXISTS insurance_bsk_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_type TEXT NOT NULL, -- 'accident', 'trading', 'life'
  policy_number TEXT NOT NULL UNIQUE,
  
  premium_inr NUMERIC NOT NULL,
  premium_bsk NUMERIC NOT NULL,
  rate_snapshot NUMERIC NOT NULL,
  
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ, -- For accident/trading plans
  maturity_at TIMESTAMPTZ, -- For life plans
  
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'cancelled', 'matured'
  region TEXT NOT NULL,
  
  beneficiaries JSONB, -- For life plans
  coverage_config JSONB NOT NULL, -- Snapshot of plan config at purchase
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create BSK insurance claims table
CREATE TABLE IF NOT EXISTS insurance_bsk_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES insurance_bsk_policies(id),
  user_id UUID NOT NULL,
  
  claim_type TEXT NOT NULL, -- 'accident_claim', 'trading_loss', 'life_maturity'
  claim_reference TEXT NOT NULL UNIQUE,
  
  -- Claim period/timing
  incident_at TIMESTAMPTZ, -- For accident claims
  period_start TIMESTAMPTZ, -- For trading claims
  period_end TIMESTAMPTZ, -- For trading claims
  
  -- Claim details
  description TEXT,
  evidence_documents JSONB DEFAULT '[]'::jsonb,
  internal_data JSONB, -- Auto-attached data like trading reports
  
  -- Status and review
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'submitted', 'in_review', 'approved', 'rejected', 'paid'
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Payout details
  requested_amount_inr NUMERIC,
  approved_amount_inr NUMERIC,
  payout_bsk NUMERIC,
  payout_rate_snapshot NUMERIC,
  
  -- Admin review
  reviewer_id UUID,
  admin_notes TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create BSK insurance ledger table
CREATE TABLE IF NOT EXISTS insurance_bsk_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  policy_id UUID REFERENCES insurance_bsk_policies(id),
  claim_id UUID REFERENCES insurance_bsk_claims(id),
  
  type TEXT NOT NULL, -- 'premium_debit', 'payout_credit', 'refund_credit'
  plan_type TEXT NOT NULL,
  
  bsk_amount NUMERIC NOT NULL,
  inr_amount NUMERIC NOT NULL,
  rate_snapshot NUMERIC NOT NULL,
  
  destination TEXT DEFAULT 'withdrawable', -- 'withdrawable' or 'holding'
  
  -- Idempotency and audit
  idempotency_key TEXT UNIQUE,
  processed_at TIMESTAMPTZ DEFAULT now(),
  processor_id UUID,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_insurance_bsk_policies_user_id ON insurance_bsk_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_bsk_claims_policy_id ON insurance_bsk_claims(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_bsk_claims_user_id ON insurance_bsk_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_bsk_ledger_user_id ON insurance_bsk_ledger(user_id);

-- Enable RLS
ALTER TABLE insurance_bsk_plan_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_bsk_global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_bsk_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_bsk_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_bsk_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin can manage bsk plan configs" ON insurance_bsk_plan_configs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage bsk global settings" ON insurance_bsk_global_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage all bsk policies" ON insurance_bsk_policies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can manage all bsk claims" ON insurance_bsk_claims FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admin can view all bsk ledger" ON insurance_bsk_ledger FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view active configurations
CREATE POLICY "Users can view active bsk plan configs" ON insurance_bsk_plan_configs FOR SELECT USING (is_enabled = true);
CREATE POLICY "Users can view bsk global settings" ON insurance_bsk_global_settings FOR SELECT USING (system_enabled = true);

-- Users can manage their own policies and claims
CREATE POLICY "Users can view own bsk policies" ON insurance_bsk_policies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bsk policies" ON insurance_bsk_policies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own bsk claims" ON insurance_bsk_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create bsk claims" ON insurance_bsk_claims FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own draft bsk claims" ON insurance_bsk_claims FOR UPDATE USING (auth.uid() = user_id AND status = 'draft');
CREATE POLICY "Users can view own bsk ledger" ON insurance_bsk_ledger FOR SELECT USING (auth.uid() = user_id);

-- System can insert ledger entries
CREATE POLICY "System can insert bsk ledger entries" ON insurance_bsk_ledger FOR INSERT WITH CHECK (true);

-- Insert default configurations for the three plans
INSERT INTO insurance_bsk_plan_configs (plan_type, premium_inr, plan_settings) VALUES
('accident', 10000, '{
  "waiting_period_days": 7,
  "claims_per_year": 1,
  "cooldown_days": 365,
  "coverage_amount_inr": 1000000,
  "evidence_checklist": ["government_id", "incident_report", "medical_proof", "date_time_place", "beneficiary_details"],
  "exclusions": "Intentional self-harm, fraud, pre-existing conditions"
}'::jsonb),
('trading', 10000, '{
  "coverage_period_days": 30,
  "compensation_percent": 50.0,
  "max_payout_per_period_inr": 50000,
  "allowed_markets": ["all"],
  "exclusions": "Off-platform trades, unrealized P&L excluded"
}'::jsonb),
('life', 10000, '{
  "min_term_years": 15,
  "max_term_years": 70,
  "maturity_benefit_inr": 500000,
  "min_age": 18,
  "max_age": 70,
  "early_claim_enabled": false,
  "early_claim_factor": 0.5,
  "exclusions": "Suicide, war, nuclear events"
}'::jsonb)
ON CONFLICT (plan_type) DO UPDATE SET
  plan_settings = EXCLUDED.plan_settings,
  updated_at = now();

-- Insert global settings
INSERT INTO insurance_bsk_global_settings (system_enabled) VALUES (true)
ON CONFLICT DO NOTHING;