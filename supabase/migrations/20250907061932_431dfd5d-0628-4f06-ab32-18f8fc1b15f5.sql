-- Update security table to support full PIN + biometrics implementation
ALTER TABLE security ADD COLUMN IF NOT EXISTS biometric_enabled BOOLEAN DEFAULT false;
ALTER TABLE security ADD COLUMN IF NOT EXISTS last_unlock_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE security ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0;
ALTER TABLE security ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE security ADD COLUMN IF NOT EXISTS pin_hash TEXT DEFAULT NULL;
ALTER TABLE security ADD COLUMN IF NOT EXISTS pin_salt TEXT DEFAULT NULL;

-- Update settings_user table for lock settings
ALTER TABLE settings_user ADD COLUMN IF NOT EXISTS require_unlock_on_actions BOOLEAN DEFAULT true;

-- Ensure session_lock_minutes exists in settings_user
UPDATE settings_user SET session_lock_minutes = 5 WHERE session_lock_minutes IS NULL;

-- Update login_audit table to support security events
ALTER TABLE login_audit ADD COLUMN IF NOT EXISTS device_info JSONB DEFAULT '{}';

-- Create index on login_audit for better performance
CREATE INDEX IF NOT EXISTS idx_login_audit_user_event ON login_audit(user_id, event, created_at DESC);