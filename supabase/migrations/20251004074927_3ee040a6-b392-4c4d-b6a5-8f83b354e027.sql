-- First, drop the existing code_length constraint
ALTER TABLE public.mobile_linking_settings 
DROP CONSTRAINT IF EXISTS valid_code_length;

-- Add new constraint allowing longer codes (6-16 characters)
ALTER TABLE public.mobile_linking_settings 
ADD CONSTRAINT valid_code_length CHECK (code_length >= 6 AND code_length <= 16);

-- Update existing settings to use 12-character codes
UPDATE public.mobile_linking_settings 
SET code_length = 12 
WHERE code_length < 12;

-- Update the generate_referral_code function to default to 12 characters
CREATE OR REPLACE FUNCTION public.generate_referral_code(code_length integer DEFAULT 12)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  charset text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude O,0,I,1
  result text := '';
  i integer;
  attempts integer := 0;
  max_attempts integer := 100;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..code_length LOOP
      result := result || substr(charset, floor(random() * length(charset) + 1)::integer, 1);
    END LOOP;
    
    -- Check if code is unique
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes WHERE code = result) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$function$;

-- Regenerate existing short codes (8 characters) to 12 characters
DO $$
DECLARE
  user_record RECORD;
  new_code text;
BEGIN
  FOR user_record IN 
    SELECT user_id, code FROM public.referral_codes WHERE length(code) = 8
  LOOP
    new_code := public.generate_referral_code(12);
    UPDATE public.referral_codes 
    SET code = new_code 
    WHERE user_id = user_record.user_id;
  END LOOP;
END $$;