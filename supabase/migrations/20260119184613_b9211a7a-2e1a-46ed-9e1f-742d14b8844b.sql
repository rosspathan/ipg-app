-- =====================================================
-- Unique Phone Number Enforcement for KYC Compliance
-- Approach: Remove phone from data_json for duplicates
-- =====================================================

-- Step 1: Temporarily disable the state machine trigger
DROP TRIGGER IF EXISTS enforce_kyc_state_machine_trigger ON public.kyc_profiles_new;

-- Step 2: For duplicates, remove phone from data_json (which will null out phone_computed via generation)
WITH ranked_kyc AS (
  SELECT 
    id,
    user_id,
    phone_computed,
    status,
    submitted_at,
    ROW_NUMBER() OVER (
      PARTITION BY phone_computed 
      ORDER BY 
        CASE status 
          WHEN 'approved' THEN 1 
          WHEN 'submitted' THEN 2 
          WHEN 'pending' THEN 3
          WHEN 'in_review' THEN 4
          ELSE 5 
        END,
        submitted_at DESC NULLS LAST
    ) as rn
  FROM kyc_profiles_new
  WHERE status IN ('submitted', 'pending', 'in_review', 'approved')
  AND phone_computed IS NOT NULL 
  AND phone_computed != ''
),
duplicates AS (
  SELECT id FROM ranked_kyc WHERE rn > 1
)
UPDATE kyc_profiles_new
SET data_json = data_json - 'phone'
WHERE id IN (SELECT id FROM duplicates);

-- Step 3: Re-enable the state machine trigger
CREATE TRIGGER enforce_kyc_state_machine_trigger
BEFORE INSERT OR UPDATE ON public.kyc_profiles_new
FOR EACH ROW
EXECUTE FUNCTION public.enforce_kyc_state_machine();

-- Step 4: Create unique partial index on phone_computed
CREATE UNIQUE INDEX IF NOT EXISTS idx_kyc_unique_phone_active 
ON public.kyc_profiles_new (phone_computed) 
WHERE status IN ('submitted', 'pending', 'in_review', 'approved') 
AND phone_computed IS NOT NULL 
AND phone_computed != '';

-- Step 5: Create audit table for phone number overrides
CREATE TABLE IF NOT EXISTS public.kyc_phone_override_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  old_user_id UUID,
  new_user_id UUID,
  admin_id UUID NOT NULL,
  reason TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('reset', 'reassign', 'clear')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_phone_override_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_policies WHERE policyname = 'Admins can manage phone override logs') THEN
    CREATE POLICY "Admins can manage phone override logs"
    ON public.kyc_phone_override_log FOR ALL
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Step 6: Create trigger function for phone uniqueness
CREATE OR REPLACE FUNCTION public.check_kyc_phone_uniqueness()
RETURNS TRIGGER AS $$
DECLARE
  phone_value TEXT;
  existing_user_id UUID;
  existing_status TEXT;
BEGIN
  phone_value := NULLIF(TRIM(COALESCE(NEW.data_json->>'phone', NEW.data_json->'personal'->>'phone', '')), '');
  IF phone_value IS NULL OR phone_value = '' THEN RETURN NEW; END IF;
  phone_value := REPLACE(phone_value, ' ', '');
  
  SELECT user_id, status INTO existing_user_id, existing_status
  FROM public.kyc_profiles_new
  WHERE REPLACE(COALESCE(data_json->>'phone', data_json->'personal'->>'phone', ''), ' ', '') = phone_value
  AND user_id != NEW.user_id
  AND status IN ('submitted', 'pending', 'in_review', 'approved')
  LIMIT 1;
  
  IF existing_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'PHONE_ALREADY_USED: This mobile number is already registered for KYC. Status: %. Please contact support.', existing_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS check_kyc_phone_uniqueness_trigger ON public.kyc_profiles_new;
CREATE TRIGGER check_kyc_phone_uniqueness_trigger
BEFORE INSERT OR UPDATE ON public.kyc_profiles_new
FOR EACH ROW
WHEN (NEW.status IN ('submitted', 'pending', 'in_review', 'approved'))
EXECUTE FUNCTION public.check_kyc_phone_uniqueness();

-- Step 7: Admin function to clear phone (modifies data_json, not generated column)
CREATE OR REPLACE FUNCTION public.admin_reset_kyc_phone(
  p_phone_number TEXT,
  p_reason TEXT,
  p_action TEXT DEFAULT 'clear'
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_old_user_id UUID;
  v_affected_count INT;
BEGIN
  v_admin_id := auth.uid();
  IF NOT public.has_role(v_admin_id, 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  p_phone_number := REPLACE(TRIM(p_phone_number), ' ', '');
  
  SELECT user_id INTO v_old_user_id
  FROM public.kyc_profiles_new
  WHERE REPLACE(COALESCE(data_json->>'phone', data_json->'personal'->>'phone', ''), ' ', '') = p_phone_number
  AND status IN ('submitted', 'pending', 'in_review', 'approved')
  LIMIT 1;
  
  IF v_old_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Phone number not found in active KYC records');
  END IF;
  
  -- Remove phone from data_json (this will regenerate phone_computed as NULL)
  UPDATE public.kyc_profiles_new
  SET data_json = data_json - 'phone'
  WHERE user_id = v_old_user_id
  AND status IN ('submitted', 'pending', 'in_review', 'approved');
  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  
  INSERT INTO public.kyc_phone_override_log (phone_number, old_user_id, admin_id, reason, action)
  VALUES (p_phone_number, v_old_user_id, v_admin_id, p_reason, p_action);
  
  RETURN json_build_object('success', true, 'affected_count', v_affected_count, 'old_user_id', v_old_user_id, 'action', p_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 8: Phone availability check function
CREATE OR REPLACE FUNCTION public.check_kyc_phone_available(
  p_phone_number TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_normalized_phone TEXT;
  v_existing_user_id UUID;
  v_existing_status TEXT;
BEGIN
  v_normalized_phone := REPLACE(TRIM(COALESCE(p_phone_number, '')), ' ', '');
  IF v_normalized_phone = '' THEN
    RETURN json_build_object('available', false, 'error', 'Phone number is required');
  END IF;
  
  SELECT user_id, status INTO v_existing_user_id, v_existing_status
  FROM public.kyc_profiles_new
  WHERE REPLACE(COALESCE(data_json->>'phone', data_json->'personal'->>'phone', ''), ' ', '') = v_normalized_phone
  AND status IN ('submitted', 'pending', 'in_review', 'approved')
  AND (p_user_id IS NULL OR user_id != p_user_id)
  LIMIT 1;
  
  IF v_existing_user_id IS NOT NULL THEN
    RETURN json_build_object('available', false, 'error', 'This mobile number is already used for KYC. Please contact support.', 'status', v_existing_status);
  END IF;
  
  RETURN json_build_object('available', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.check_kyc_phone_available TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_kyc_phone TO authenticated;