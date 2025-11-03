-- Phase 2: Database Cleanup & Core Configurations

-- 1) Clean all user-generated data (TRUNCATE)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'direct_referrer_rewards', 'referral_commissions', 'referral_level_rewards',
    'commission_payouts', 'vip_milestone_claims', 'user_vip_milestones',
    'badge_purchase_events', 'badge_purchases', 'ad_clicks', 'ad_user_subscriptions',
    'draw_tickets', 'draw_results', 'ismart_spins', 'insurance_bsk_policies',
    'insurance_bsk_claims', 'bsk_loan_installments', 'bsk_loan_payments', 'bsk_loans',
    'bsk_loan_applications', 'bsk_holding_ledger', 'bsk_withdrawable_ledger',
    'insurance_bsk_ledger', 'bsk_bonus_events', 'bsk_bonus_vesting_schedules',
    'bsk_vesting_referral_rewards', 'daily_rewards', 'referral_events', 'referral_tree'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', t);
    END IF;
  END LOOP;
END$$;

-- 2) Ad Mining: one active subscription per user
ALTER TABLE ad_user_subscriptions ADD COLUMN IF NOT EXISTS active_until TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION check_single_active_subscription()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND (NEW.active_until IS NULL OR NEW.active_until > CURRENT_TIMESTAMP) THEN
    IF EXISTS (
      SELECT 1 FROM ad_user_subscriptions
      WHERE user_id = NEW.user_id AND id != COALESCE(NEW.id, gen_random_uuid())
        AND status = 'active' AND (active_until IS NULL OR active_until > CURRENT_TIMESTAMP)
    ) THEN
      RAISE EXCEPTION 'User already has an active subscription';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_single_active_subscription ON ad_user_subscriptions;
CREATE TRIGGER trg_check_single_active_subscription
  BEFORE INSERT OR UPDATE ON ad_user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION check_single_active_subscription();

-- 3) Spin Wheel: 4 equal segments (50% house edge)
UPDATE ismart_spin_config SET 
  min_bet_bsk = 100, max_bet_bsk = 1000, free_spins_count = 5,
  post_free_fee_bsk = 10, winning_fee_percent = 10
WHERE id IS NOT NULL;

DO $$
DECLARE cfg RECORD;
BEGIN
  FOR cfg IN SELECT id FROM ismart_spin_config LOOP
    DELETE FROM ismart_spin_segments WHERE config_id = cfg.id;
    INSERT INTO ismart_spin_segments (config_id, label, multiplier, weight, color_hex, is_active, position_order) VALUES 
      (cfg.id, 'WIN', 1.0, 25, '#22c55e', true, 1),
      (cfg.id, 'LOSE', 0.0, 25, '#ef4444', true, 2),
      (cfg.id, 'WIN', 1.0, 25, '#22c55e', true, 3),
      (cfg.id, 'LOSE', 0.0, 25, '#ef4444', true, 4);
  END LOOP;
END$$;

-- 4) Lucky Draw: auto-flag when full (100 participants)
ALTER TABLE draw_configs 
  ALTER COLUMN pool_size SET DEFAULT 100,
  ALTER COLUMN fee_percent SET DEFAULT 10.0;

CREATE OR REPLACE FUNCTION auto_flag_lucky_draw_full()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_participants >= NEW.pool_size AND NEW.state = 'open' THEN
    NEW.state := 'pending_execution';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_flag_draw_full ON draw_configs;
CREATE TRIGGER trg_auto_flag_draw_full
  BEFORE UPDATE OF current_participants ON draw_configs
  FOR EACH ROW EXECUTE FUNCTION auto_flag_lucky_draw_full();

-- 5) Insurance: add manual review flag
ALTER TABLE insurance_bsk_claims ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT true;

-- 6) Admin audit log
CREATE TABLE IF NOT EXISTS admin_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_actions_log_view ON admin_actions_log;
CREATE POLICY admin_actions_log_view ON admin_actions_log 
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS admin_actions_log_insert ON admin_actions_log;
CREATE POLICY admin_actions_log_insert ON admin_actions_log 
  FOR INSERT WITH CHECK (true);