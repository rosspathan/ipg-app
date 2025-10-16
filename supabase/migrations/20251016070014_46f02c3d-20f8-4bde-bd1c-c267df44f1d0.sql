-- Phase 1: Deposits and Withdrawals Tables

-- Create deposits table for tracking crypto deposits
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
  tx_hash TEXT UNIQUE,
  network TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirming', 'completed', 'failed')),
  confirmations INT DEFAULT 0 CHECK (confirmations >= 0),
  required_confirmations INT DEFAULT 12 CHECK (required_confirmations > 0),
  credited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create withdrawals table for tracking crypto withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
  amount NUMERIC(20, 8) NOT NULL CHECK (amount > 0),
  fee NUMERIC(20, 8) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  net_amount NUMERIC(20, 8) NOT NULL CHECK (net_amount > 0),
  to_address TEXT NOT NULL,
  network TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'failed')),
  tx_hash TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add setup tracking columns to profiles if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'setup_complete') THEN
    ALTER TABLE profiles ADD COLUMN setup_complete BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'onboarding_step') THEN
    ALTER TABLE profiles ADD COLUMN onboarding_step TEXT DEFAULT 'splash';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Deposits RLS Policies
CREATE POLICY "Users view own deposits" ON deposits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System creates deposits" ON deposits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System updates deposits" ON deposits
  FOR UPDATE USING (true);

CREATE POLICY "Admin manages all deposits" ON deposits
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Withdrawals RLS Policies
CREATE POLICY "Users view own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create withdrawals" ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin manages all withdrawals" ON withdrawals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deposits_user_id ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deposits_updated_at BEFORE UPDATE ON deposits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON withdrawals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update existing profiles to mark setup as complete if they have essential data
UPDATE profiles 
SET setup_complete = TRUE 
WHERE (email IS NOT NULL OR wallet_address IS NOT NULL) 
  AND setup_complete IS FALSE;