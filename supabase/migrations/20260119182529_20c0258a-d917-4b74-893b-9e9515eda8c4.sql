-- ============================================
-- KYC System Overhaul: Prevent Duplicates & Enforce State Machine
-- ============================================

-- 1. Create a function to enforce KYC state machine rules
CREATE OR REPLACE FUNCTION public.enforce_kyc_state_machine()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this is an INSERT
  IF TG_OP = 'INSERT' THEN
    -- Check if user already has a KYC for this level that is pending/approved
    IF EXISTS (
      SELECT 1 FROM kyc_profiles_new 
      WHERE user_id = NEW.user_id 
        AND level = NEW.level 
        AND status IN ('submitted', 'pending', 'in_review', 'approved')
    ) THEN
      RAISE EXCEPTION 'User already has a KYC submission in progress or approved for this level';
    END IF;
    RETURN NEW;
  END IF;

  -- If this is an UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Prevent status changes from approved state
    IF OLD.status = 'approved' AND NEW.status != 'approved' THEN
      RAISE EXCEPTION 'Cannot change status of approved KYC submission';
    END IF;
    
    -- Prevent resubmission if already pending/in_review
    IF OLD.status IN ('submitted', 'pending', 'in_review') 
       AND NEW.status = 'submitted' 
       AND OLD.id != NEW.id THEN
      RAISE EXCEPTION 'Cannot submit new KYC while another is pending review';
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_enforce_kyc_state_machine ON kyc_profiles_new;

-- Create the trigger
CREATE TRIGGER trg_enforce_kyc_state_machine
  BEFORE INSERT OR UPDATE ON kyc_profiles_new
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_kyc_state_machine();

-- 2. Add review_notes column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'kyc_profiles_new' 
      AND column_name = 'review_notes'
  ) THEN
    ALTER TABLE kyc_profiles_new ADD COLUMN review_notes TEXT;
  END IF;
END $$;

-- 3. Create a view that shows only the latest KYC per user (for admin)
DROP VIEW IF EXISTS kyc_admin_summary;
CREATE VIEW kyc_admin_summary AS
SELECT DISTINCT ON (user_id)
  kp.id,
  kp.user_id,
  kp.level,
  kp.status,
  kp.data_json,
  kp.full_name_computed,
  kp.email_computed,
  kp.phone_computed,
  kp.submitted_at,
  kp.reviewed_at,
  kp.reviewer_id,
  kp.rejection_reason,
  kp.review_notes,
  kp.created_at,
  kp.updated_at,
  p.email as profile_email,
  p.display_name,
  p.username
FROM kyc_profiles_new kp
LEFT JOIN profiles p ON p.user_id = kp.user_id
WHERE kp.status != 'none' AND kp.status != 'draft'
ORDER BY kp.user_id, 
  CASE 
    WHEN kp.status = 'submitted' THEN 1
    WHEN kp.status = 'pending' THEN 2
    WHEN kp.status = 'in_review' THEN 3
    WHEN kp.status = 'rejected' THEN 4
    WHEN kp.status = 'approved' THEN 5
    ELSE 6
  END,
  kp.submitted_at DESC NULLS LAST;

-- 4. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_user_status ON kyc_profiles_new(user_id, status);
CREATE INDEX IF NOT EXISTS idx_kyc_profiles_status ON kyc_profiles_new(status);

-- 5. Grant access to the view for authenticated users (admins will use it)
GRANT SELECT ON kyc_admin_summary TO authenticated;