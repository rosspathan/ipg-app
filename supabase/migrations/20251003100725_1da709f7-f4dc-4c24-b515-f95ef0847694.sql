-- Make target_url optional in ads table
ALTER TABLE public.ads 
ALTER COLUMN target_url DROP NOT NULL;

COMMENT ON COLUMN public.ads.target_url IS 'Optional URL to navigate to when ad is clicked. If null, ad is view-only for rewards.';