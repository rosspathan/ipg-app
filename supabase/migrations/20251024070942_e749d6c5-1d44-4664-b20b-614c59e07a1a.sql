-- Create crypto_to_inr_requests table
CREATE TABLE crypto_to_inr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Crypto side
  crypto_asset_id UUID NOT NULL REFERENCES assets(id),
  crypto_amount NUMERIC NOT NULL CHECK (crypto_amount > 0),
  tx_hash TEXT NOT NULL UNIQUE,
  network TEXT NOT NULL,
  deposit_id UUID REFERENCES deposits(id),
  
  -- INR conversion
  crypto_usd_rate NUMERIC,
  inr_usd_rate NUMERIC,
  inr_equivalent NUMERIC NOT NULL CHECK (inr_equivalent > 0),
  
  -- Fees
  deposit_fee_percent NUMERIC DEFAULT 0,
  deposit_fee_fixed NUMERIC DEFAULT 0,
  total_fee NUMERIC DEFAULT 0,
  net_inr_credit NUMERIC,
  
  -- Proof & verification
  proof_url TEXT,
  user_notes TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'verifying', 'approved', 'rejected', 'canceled')),
  admin_notes TEXT,
  
  -- Timestamps & audit
  created_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_crypto_inr_user ON crypto_to_inr_requests(user_id);
CREATE INDEX idx_crypto_inr_status ON crypto_to_inr_requests(status);
CREATE INDEX idx_crypto_inr_created ON crypto_to_inr_requests(created_at DESC);
CREATE INDEX idx_crypto_inr_tx_hash ON crypto_to_inr_requests(tx_hash);

-- Create crypto_deposit_fee_configs table
CREATE TABLE crypto_deposit_fee_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES assets(id),
  network TEXT,
  
  -- Fee structure
  fee_type TEXT DEFAULT 'both' CHECK (fee_type IN ('percent', 'fixed', 'both')),
  fee_percent NUMERIC DEFAULT 0 CHECK (fee_percent >= 0 AND fee_percent <= 100),
  fee_fixed NUMERIC DEFAULT 0 CHECK (fee_fixed >= 0),
  
  -- Min/Max for crypto deposits
  min_deposit_amount NUMERIC DEFAULT 0,
  max_deposit_amount NUMERIC,
  
  -- Settings
  auto_approve_threshold NUMERIC,
  requires_proof BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(asset_id, network)
);

-- Create admin_notification_preferences table
CREATE TABLE admin_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Notification channels
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  
  -- Notification types
  notify_crypto_inr_deposit BOOLEAN DEFAULT true,
  notify_inr_deposit BOOLEAN DEFAULT true,
  notify_inr_withdrawal BOOLEAN DEFAULT true,
  notify_crypto_withdrawal BOOLEAN DEFAULT false,
  
  -- Thresholds
  min_amount_threshold NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- RLS Policies for crypto_to_inr_requests
ALTER TABLE crypto_to_inr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own crypto-INR requests"
  ON crypto_to_inr_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own crypto-INR requests"
  ON crypto_to_inr_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all crypto-INR requests"
  ON crypto_to_inr_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can cancel own pending requests"
  ON crypto_to_inr_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (status = 'canceled');

-- RLS Policies for crypto_deposit_fee_configs
ALTER TABLE crypto_deposit_fee_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view active fee configs"
  ON crypto_deposit_fee_configs FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage fee configs"
  ON crypto_deposit_fee_configs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for admin_notification_preferences
ALTER TABLE admin_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notification preferences"
  ON admin_notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Insert default fee configs for major cryptos
INSERT INTO crypto_deposit_fee_configs (asset_id, network, fee_percent, fee_fixed, active)
SELECT id, network, 0.5, 0, true
FROM assets
WHERE symbol IN ('USDT', 'USDC', 'BTC', 'ETH', 'BNB') AND withdraw_enabled = true;