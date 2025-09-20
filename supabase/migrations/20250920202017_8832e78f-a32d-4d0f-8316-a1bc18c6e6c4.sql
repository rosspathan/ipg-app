-- Update test ads to remove Lovable references
UPDATE public.ads 
SET target_url = 'https://example.com'
WHERE target_url LIKE '%lovable%';

-- Also update the titles to be more generic
UPDATE public.ads 
SET 
  title = 'Daily BSK Rewards - Click to Earn!',
  target_url = 'https://example.com'
WHERE title = 'Earn Free BSK Tokens - Click to Win!';

UPDATE public.ads 
SET 
  title = 'Bonus BSK Tokens Available!',
  target_url = 'https://google.com'
WHERE title = 'Double Your BSK Rewards Today!';