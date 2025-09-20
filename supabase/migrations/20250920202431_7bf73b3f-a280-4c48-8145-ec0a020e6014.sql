-- Update all ads to use completely neutral websites
UPDATE public.ads 
SET target_url = CASE 
  WHEN title LIKE '%Daily%' THEN 'https://www.wikipedia.org'
  WHEN title LIKE '%Bonus%' THEN 'https://www.github.com'
  ELSE 'https://www.stackoverflow.com'
END
WHERE status = 'active';

-- Make sure no ads point to any Lovable properties
UPDATE public.ads 
SET target_url = 'https://www.wikipedia.org'
WHERE target_url LIKE '%lovable%' OR target_url LIKE '%docs.lovable%';