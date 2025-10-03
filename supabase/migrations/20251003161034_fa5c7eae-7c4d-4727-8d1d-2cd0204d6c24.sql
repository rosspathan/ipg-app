-- Add foreign key relationship between bsk_loans and profiles
-- First check if the foreign key already exists, if not add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bsk_loans_user_id_fkey'
  ) THEN
    ALTER TABLE public.bsk_loans
    ADD CONSTRAINT bsk_loans_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES public.profiles(user_id) 
    ON DELETE CASCADE;
  END IF;
END $$;

COMMENT ON CONSTRAINT bsk_loans_user_id_fkey ON public.bsk_loans IS 'Links loan to user profile for displaying user information';