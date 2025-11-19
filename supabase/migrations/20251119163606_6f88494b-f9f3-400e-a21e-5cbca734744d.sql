-- Re-enable BSK transfers (fixing current state)
UPDATE system_settings 
SET value = 'true', updated_at = now() 
WHERE key = 'bsk_transfers_enabled';

-- Ensure the setting exists with sane default
INSERT INTO system_settings (key, value, updated_at)
VALUES ('bsk_transfers_enabled', 'true', now())
ON CONFLICT (key) DO NOTHING;