-- Fix route mismatches in program_modules
UPDATE program_modules SET route = '/app/programs/advertising' WHERE key = 'advertising';
UPDATE program_modules SET route = '/app/programs/spin' WHERE key = 'spin';
UPDATE program_modules SET route = '/app/programs/lucky-draw' WHERE key = 'lucky-draw';
UPDATE program_modules SET route = '/app/programs/bsk-bonus' WHERE key = 'bsk-bonus';
UPDATE program_modules SET route = '/app/programs/referrals' WHERE key = 'referrals';
UPDATE program_modules SET route = '/app/programs/staking' WHERE key = 'staking';
UPDATE program_modules SET route = '/app/programs/loans' WHERE key = 'loans';
UPDATE program_modules SET route = '/app/programs/insurance' WHERE key = 'insurance';

-- Create published configs for missing programs
INSERT INTO program_configs (module_id, config_json, schema_json, status, is_current, version)
SELECT 
  id,
  CASE key
    WHEN 'lucky-draw' THEN '{"description": "Win big prizes", "badge": "HOT", "badgeColor": "bg-danger/20 text-danger"}'::jsonb
    WHEN 'referrals' THEN '{"description": "Earn commissions", "badge": null, "badgeColor": null}'::jsonb
    WHEN 'staking' THEN '{"description": "Earn passive rewards", "badge": null, "badgeColor": null}'::jsonb
    WHEN 'loans' THEN '{"description": "0% interest", "badge": null, "badgeColor": null}'::jsonb
    WHEN 'insurance' THEN '{"description": "Protect assets", "badge": null, "badgeColor": null}'::jsonb
    WHEN 'bsk-bonus' THEN '{"description": "Get 50% extra!", "badge": "NEW", "badgeColor": "bg-primary/20 text-primary"}'::jsonb
  END,
  '{}'::jsonb,
  'published',
  true,
  1
FROM program_modules
WHERE key IN ('lucky-draw', 'referrals', 'staking', 'loans', 'insurance', 'bsk-bonus')
  AND status = 'live'
  AND NOT EXISTS (
    SELECT 1 FROM program_configs pc 
    WHERE pc.module_id = program_modules.id 
    AND pc.is_current = true 
    AND pc.status = 'published'
  );
