-- Fix program routes to match App.tsx paths
UPDATE program_modules SET route = '/app/programs/spin' WHERE key = 'spin_wheel';
UPDATE program_modules SET route = '/app/programs/lucky-draw' WHERE key = 'lucky_draw';
UPDATE program_modules SET route = '/app/programs/ad-mining' WHERE key = 'adverts_mining';
UPDATE program_modules SET route = '/app/programs/team-referrals' WHERE key = 'referrals_team';
UPDATE program_modules SET route = '/app/programs/bsk-loans' WHERE key = 'bsk_loans';
UPDATE program_modules SET route = '/app/programs/bsk-promotions' WHERE key = 'one_time_bsk';
UPDATE program_modules SET route = '/app/trading' WHERE key = 'trading';