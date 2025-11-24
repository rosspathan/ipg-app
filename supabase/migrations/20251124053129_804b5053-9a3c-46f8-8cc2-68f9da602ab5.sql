-- Activate Program Milestone System

-- Insert program modules
INSERT INTO program_modules (key, name, category, description, icon, route, status, enabled_regions, enabled_roles, order_index, featured) VALUES
('team-building', 'Team Building', 'earnings', 'Build your team and unlock milestone rewards', 'Users', '/referrals', 'live', '["IN","GLOBAL"]'::jsonb, '["user","admin"]'::jsonb, 1, true),
('ad-mining', 'Ad Mining', 'earnings', 'Watch ads and mine BSK tokens', 'PlayCircle', '/ad-mining', 'live', '["IN","GLOBAL"]'::jsonb, '["user","admin"]'::jsonb, 2, true),
('lucky-draw', 'Lucky Draw', 'games', 'Try your luck and win exciting prizes', 'Ticket', '/lucky-draw', 'live', '["IN","GLOBAL"]'::jsonb, '["user","admin"]'::jsonb, 3, true),
('spin-wheel', 'Spin Wheel', 'games', 'Spin the wheel for instant rewards', 'CircleDot', '/spin', 'live', '["IN","GLOBAL"]'::jsonb, '["user","admin"]'::jsonb, 4, true),
('bsk-loans', 'BSK Loans', 'finance', 'Get instant BSK loans with flexible repayment', 'Landmark', '/loans', 'live', '["IN","GLOBAL"]'::jsonb, '["user","admin"]'::jsonb, 5, false),
('staking', 'Staking', 'finance', 'Stake your tokens and earn rewards', 'TrendingUp', '/staking', 'live', '["IN","GLOBAL"]'::jsonb, '["user","admin"]'::jsonb, 6, false)
ON CONFLICT (key) DO NOTHING;

-- Create milestone templates table
CREATE TABLE IF NOT EXISTS program_milestone_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT NOT NULL UNIQUE,
  milestones JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Populate milestone templates
INSERT INTO program_milestone_templates (module_key, milestones) VALUES
('team-building', '[{"key":"first_referral","type":"achievement","target":1,"title":"First Recruit","description":"Invite your first team member","reward_bsk":100},{"key":"team_of_5","type":"threshold","target":5,"title":"Team of 5","description":"Build a team of 5 active members","reward_bsk":500},{"key":"team_of_10","type":"threshold","target":10,"title":"Team of 10","description":"Grow your team to 10 members","reward_bsk":1500}]'::jsonb),
('ad-mining', '[{"key":"first_ad","type":"achievement","target":1,"title":"First View","description":"Watch your first ad","reward_bsk":10},{"key":"ads_10","type":"threshold","target":10,"title":"Active Viewer","description":"Watch 10 ads","reward_bsk":100},{"key":"ads_50","type":"threshold","target":50,"title":"Regular Miner","description":"Complete 50 ad views","reward_bsk":500}]'::jsonb),
('lucky-draw', '[{"key":"first_entry","type":"achievement","target":1,"title":"Lucky Start","description":"Enter your first draw","reward_bsk":50},{"key":"entries_10","type":"threshold","target":10,"title":"Hopeful Player","description":"Enter 10 draws","reward_bsk":200}]'::jsonb),
('spin-wheel', '[{"key":"first_spin","type":"achievement","target":1,"title":"First Spin","description":"Spin the wheel for the first time","reward_bsk":25},{"key":"spins_10","type":"threshold","target":10,"title":"Spinner","description":"Complete 10 spins","reward_bsk":150}]'::jsonb),
('bsk-loans', '[{"key":"first_loan","type":"achievement","target":1,"title":"First Loan","description":"Take your first BSK loan","reward_bsk":50},{"key":"loan_repaid_1","type":"threshold","target":1,"title":"Responsible Borrower","description":"Fully repay your first loan","reward_bsk":200}]'::jsonb),
('staking', '[{"key":"first_stake","type":"achievement","target":1,"title":"First Stake","description":"Make your first stake","reward_bsk":100}]'::jsonb)
ON CONFLICT (module_key) DO UPDATE SET milestones = EXCLUDED.milestones, updated_at = now();

-- Helper function to initialize milestones
CREATE OR REPLACE FUNCTION initialize_program_milestones(p_user_id UUID, p_module_id UUID, p_milestones JSONB)
RETURNS void AS $$
DECLARE milestone JSONB;
BEGIN
  FOR milestone IN SELECT * FROM jsonb_array_elements(p_milestones) LOOP
    INSERT INTO user_program_progress (user_id, module_id, milestone_key, milestone_type, current_value, target_value, is_completed, metadata)
    VALUES (p_user_id, p_module_id, milestone->>'key', milestone->>'type', 0, (milestone->>'target')::numeric, false, milestone->'metadata')
    ON CONFLICT (user_id, module_id, milestone_key) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE program_milestone_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates readable" ON program_milestone_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Templates admin only" ON program_milestone_templates FOR ALL TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));