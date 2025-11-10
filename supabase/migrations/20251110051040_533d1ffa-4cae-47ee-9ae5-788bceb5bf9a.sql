-- Phase 1-5: BSK Purchase Enhancement Migration
-- Add payment method support, notification triggers, and audit trail

-- Step 1: Enhance bsk_manual_purchase_requests table
ALTER TABLE bsk_manual_purchase_requests 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'BEP20' CHECK (payment_method IN ('BEP20', 'UPI', 'IMPS')),
ADD COLUMN IF NOT EXISTS utr_number text,
ADD COLUMN IF NOT EXISTS payer_name text,
ADD COLUMN IF NOT EXISTS payer_contact text,
ADD COLUMN IF NOT EXISTS ip_address inet;

-- Step 2: Add rejection reason constraint
ALTER TABLE bsk_manual_purchase_requests
DROP CONSTRAINT IF EXISTS rejection_requires_reason;

ALTER TABLE bsk_manual_purchase_requests
ADD CONSTRAINT rejection_requires_reason 
CHECK (
  status != 'rejected' OR 
  (rejected_reason IS NOT NULL AND LENGTH(TRIM(rejected_reason)) > 0)
);

-- Step 3: Enhance bsk_purchase_settings for UPI/IMPS
ALTER TABLE bsk_purchase_settings
ADD COLUMN IF NOT EXISTS admin_upi_id text,
ADD COLUMN IF NOT EXISTS admin_bank_name text,
ADD COLUMN IF NOT EXISTS admin_account_number text,
ADD COLUMN IF NOT EXISTS admin_ifsc_code text,
ADD COLUMN IF NOT EXISTS admin_account_holder text,
ADD COLUMN IF NOT EXISTS payment_methods_enabled text[] DEFAULT ARRAY['BEP20']::text[];

-- Step 4: Create admin notification function for new purchases
CREATE OR REPLACE FUNCTION notify_admin_on_bsk_purchase()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (
    type,
    title,
    message,
    related_user_id,
    related_resource_id,
    priority,
    metadata
  ) VALUES (
    'bsk_purchase_request',
    'New BSK Purchase Request',
    format('User %s submitted %.2f BSK purchase via %s', 
      NEW.email, 
      NEW.purchase_amount, 
      NEW.payment_method
    ),
    NEW.user_id,
    NEW.id,
    'high',
    jsonb_build_object(
      'amount', NEW.purchase_amount,
      'payment_method', NEW.payment_method,
      'transaction_hash', NEW.transaction_hash,
      'utr_number', NEW.utr_number,
      'payer_name', NEW.payer_name
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_bsk_purchase_request ON bsk_manual_purchase_requests;

CREATE TRIGGER on_bsk_purchase_request
  AFTER INSERT ON bsk_manual_purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_bsk_purchase();

-- Step 5: Create user notification function for purchase decisions
CREATE OR REPLACE FUNCTION notify_user_on_purchase_decision()
RETURNS TRIGGER AS $$
DECLARE
  notification_title text;
  notification_message text;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    notification_title := 'BSK Purchase Approved ✅';
    notification_message := format(
      'Your purchase of %s BSK has been approved! You received %s total BSK (%s withdrawable + %s holding).',
      NEW.purchase_amount::text,
      NEW.total_received::text,
      NEW.withdrawable_amount::text,
      NEW.holding_bonus_amount::text
    );
    
    -- Insert user notification (assuming user_notifications table exists)
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      NEW.user_id,
      'bsk_purchase_approved',
      notification_title,
      notification_message,
      jsonb_build_object(
        'purchase_id', NEW.id,
        'amount', NEW.purchase_amount,
        'total_received', NEW.total_received
      )
    );
    
  ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    notification_title := 'BSK Purchase Rejected ❌';
    notification_message := format(
      'Your purchase of %s BSK was rejected. Reason: %s',
      NEW.purchase_amount::text,
      COALESCE(NEW.rejected_reason, 'No reason provided')
    );
    
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      message,
      metadata
    ) VALUES (
      NEW.user_id,
      'bsk_purchase_rejected',
      notification_title,
      notification_message,
      jsonb_build_object(
        'purchase_id', NEW.id,
        'amount', NEW.purchase_amount,
        'reason', NEW.rejected_reason
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_purchase_decision ON bsk_manual_purchase_requests;

CREATE TRIGGER on_purchase_decision
  AFTER UPDATE OF status ON bsk_manual_purchase_requests
  FOR EACH ROW
  WHEN (NEW.status IN ('approved', 'rejected'))
  EXECUTE FUNCTION notify_user_on_purchase_decision();

-- Step 6: Add purchase entries to unified transaction history
CREATE OR REPLACE FUNCTION add_purchase_to_history()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Add withdrawable BSK to unified history
    INSERT INTO unified_bsk_transactions (
      user_id,
      transaction_type,
      balance_type,
      amount,
      description,
      metadata,
      created_at
    ) VALUES (
      NEW.user_id,
      'purchase',
      'withdrawable',
      NEW.withdrawable_amount,
      format('BSK Purchase via %s', NEW.payment_method),
      jsonb_build_object(
        'purchase_id', NEW.id,
        'payment_method', NEW.payment_method,
        'transaction_ref', COALESCE(NEW.transaction_hash, NEW.utr_number),
        'admin_approved_by', NEW.approved_by,
        'purchase_amount', NEW.purchase_amount,
        'bonus_amount', NEW.holding_bonus_amount
      ),
      NEW.created_at
    );
    
    -- Add holding bonus to unified history
    IF NEW.holding_bonus_amount > 0 THEN
      INSERT INTO unified_bsk_transactions (
        user_id,
        transaction_type,
        balance_type,
        amount,
        description,
        metadata,
        created_at
      ) VALUES (
        NEW.user_id,
        'purchase_bonus',
        'holding',
        NEW.holding_bonus_amount,
        format('BSK Purchase Bonus (+50%%) via %s', NEW.payment_method),
        jsonb_build_object(
          'purchase_id', NEW.id,
          'payment_method', NEW.payment_method,
          'related_withdrawable_amount', NEW.withdrawable_amount
        ),
        NEW.created_at
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS add_approved_purchase_to_history ON bsk_manual_purchase_requests;

CREATE TRIGGER add_approved_purchase_to_history
  AFTER UPDATE OF status ON bsk_manual_purchase_requests
  FOR EACH ROW
  EXECUTE FUNCTION add_purchase_to_history();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bsk_purchase_requests_user_status 
ON bsk_manual_purchase_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_bsk_purchase_requests_payment_method 
ON bsk_manual_purchase_requests(payment_method);

CREATE INDEX IF NOT EXISTS idx_bsk_purchase_requests_created 
ON bsk_manual_purchase_requests(created_at DESC);

-- Grant necessary permissions
GRANT SELECT ON bsk_manual_purchase_requests TO authenticated;
GRANT INSERT ON bsk_manual_purchase_requests TO authenticated;
GRANT UPDATE ON bsk_manual_purchase_requests TO service_role;

COMMENT ON COLUMN bsk_manual_purchase_requests.payment_method IS 'Payment method: BEP20, UPI, or IMPS';
COMMENT ON COLUMN bsk_manual_purchase_requests.utr_number IS 'UTR/Reference number for UPI/IMPS transactions';
COMMENT ON COLUMN bsk_manual_purchase_requests.ip_address IS 'IP address of user submitting request';
COMMENT ON TRIGGER on_bsk_purchase_request ON bsk_manual_purchase_requests IS 'Sends instant notification to admins on new purchase request';
COMMENT ON TRIGGER on_purchase_decision ON bsk_manual_purchase_requests IS 'Notifies users when their purchase is approved or rejected';
COMMENT ON TRIGGER add_approved_purchase_to_history ON bsk_manual_purchase_requests IS 'Adds approved purchases to unified transaction history';