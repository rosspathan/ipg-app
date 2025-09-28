-- First, clear and recreate insurance plan configurations with exact specifications

-- Clear existing plans and insert the three operational plans
TRUNCATE TABLE insurance_bsk_plan_configs;

-- Accident Plan: ₹10,000 premium/year; payout ₹10,00,000 per approved claim
INSERT INTO insurance_bsk_plan_configs (
  plan_type, 
  premium_inr, 
  plan_settings, 
  is_enabled
) VALUES (
  'accident',
  10000.00,
  jsonb_build_object(
    'coverage_amount', 1000000,
    'premium_frequency', 'yearly',
    'claim_limit_per_period', 1000000,
    'max_claims_per_year', 1,
    'coverage_description', 'Comprehensive accident protection with ₹10,00,000 payout on approved claims',
    'evidence_required', jsonb_build_array('medical_reports', 'police_report', 'hospital_bills', 'witness_statements'),
    'regions_covered', jsonb_build_array('IN', 'global'),
    'kyc_required', true,
    'auto_approval', false,
    'manual_review_required', true
  ),
  true
);

-- Trading Plan: ₹10,000 premium/period; payout = 50% of realized net loss up to ₹50,000 per period
INSERT INTO insurance_bsk_plan_configs (
  plan_type, 
  premium_inr, 
  plan_settings, 
  is_enabled
) VALUES (
  'trading',
  10000.00,
  jsonb_build_object(
    'coverage_percentage', 50,
    'max_coverage_amount', 50000,
    'premium_frequency', 'monthly',
    'period_type', 'monthly',
    'coverage_description', '50% protection on realized trading losses up to ₹50,000 per month',
    'evidence_required', jsonb_build_array('trading_statements', 'transaction_history', 'loss_calculation', 'account_statements'),
    'regions_covered', jsonb_build_array('IN'),
    'kyc_required', true,
    'auto_approval', false,
    'manual_review_required', true,
    'loss_verification_required', true
  ),
  true
);

-- Life Plan: one-time ₹10,000 premium; maturity term 15–70 years; maturity payout ₹5,00,000
INSERT INTO insurance_bsk_plan_configs (
  plan_type, 
  premium_inr, 
  plan_settings, 
  is_enabled
) VALUES (
  'life',
  10000.00,
  jsonb_build_object(
    'maturity_amount', 500000,
    'premium_frequency', 'one_time',
    'min_maturity_years', 15,
    'max_maturity_years', 70,
    'coverage_description', 'Life insurance with ₹5,00,000 guaranteed maturity payout after 15-70 years',
    'evidence_required', jsonb_build_array('medical_certificate', 'age_proof', 'income_proof', 'nominee_details'),
    'regions_covered', jsonb_build_array('IN', 'global'),
    'kyc_required', true,
    'auto_approval', false,
    'manual_review_required', true,
    'beneficiary_required', true,
    'maturity_calculation', 'fixed_amount'
  ),
  true
);

-- Update global settings using existing columns
UPDATE insurance_bsk_global_settings 
SET 
  system_enabled = true,
  kyc_required_for_payout = true,
  payout_destination = 'admin_controlled',
  refund_window_hours = 72,
  disclaimer_text = 'All insurance claims require manual approval. No automatic payouts. All transactions are audited.',
  updated_at = now()
WHERE id = (SELECT id FROM insurance_bsk_global_settings ORDER BY created_at DESC LIMIT 1);

-- Add missing columns to global settings for full admin control
ALTER TABLE insurance_bsk_global_settings 
ADD COLUMN IF NOT EXISTS auto_approval_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS manual_review_required BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audit_all_transactions BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS admin_approval_required BOOLEAN DEFAULT true;

-- Update the new columns
UPDATE insurance_bsk_global_settings 
SET 
  auto_approval_enabled = false,
  manual_review_required = true,
  audit_all_transactions = true,
  admin_approval_required = true,
  updated_at = now();

-- Create admin control settings table for fine-grained control
CREATE TABLE IF NOT EXISTS insurance_admin_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  control_type TEXT NOT NULL, -- 'rates', 'terms', 'evidence', 'caps', 'regions', 'kyc', 'payouts', 'refunds'
  control_settings JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(control_type)
);

-- Enable RLS on admin controls
ALTER TABLE insurance_admin_controls ENABLE ROW LEVEL SECURITY;

-- RLS policies for admin controls
DROP POLICY IF EXISTS "Admin can manage insurance controls" ON insurance_admin_controls;
CREATE POLICY "Admin can manage insurance controls" ON insurance_admin_controls
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default admin control settings
INSERT INTO insurance_admin_controls (control_type, control_settings, is_enabled)
VALUES 
  ('rates', jsonb_build_object('dynamic_pricing', false, 'admin_override', true), true),
  ('terms', jsonb_build_object('custom_terms_allowed', true, 'template_based', true), true),
  ('evidence', jsonb_build_object('custom_checklists', true, 'mandatory_docs', true), true),
  ('caps', jsonb_build_object('coverage_limits', true, 'claim_frequency_limits', true), true),
  ('regions', jsonb_build_object('geo_restrictions', true, 'country_specific_terms', true), true),
  ('kyc', jsonb_build_object('verification_levels', jsonb_build_array('basic', 'enhanced', 'premium'), 'mandatory', true), true),
  ('payouts', jsonb_build_object('destination_control', 'admin', 'approval_workflow', true), true),
  ('refunds', jsonb_build_object('policy_enabled', true, 'admin_approval_required', true), true)
ON CONFLICT (control_type) DO UPDATE SET
  control_settings = EXCLUDED.control_settings,
  updated_at = now();