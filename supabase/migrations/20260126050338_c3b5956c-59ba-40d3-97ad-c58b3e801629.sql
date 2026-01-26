-- Hide loans program from users (set to archived)
UPDATE program_modules
SET status = 'archived'
WHERE key = 'bsk-loans';

-- Also update program_flags to disable loans
INSERT INTO program_flags (program_code, enabled, updated_at)
VALUES ('loans', false, now())
ON CONFLICT (program_code) 
DO UPDATE SET enabled = false, updated_at = now();