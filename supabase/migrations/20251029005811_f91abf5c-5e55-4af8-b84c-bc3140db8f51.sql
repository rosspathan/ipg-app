-- Allow sponsor_code_used to be NULL for users without sponsors
ALTER TABLE referral_links_new 
ALTER COLUMN sponsor_code_used DROP NOT NULL;