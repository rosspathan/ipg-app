-- Fix ad mining daily limit to match admin-intended value of 50
UPDATE public.ad_mining_settings 
SET max_free_per_day = 50, updated_at = now()
WHERE id = '533be907-7ce5-46f1-bedd-4b1524cd2b47';

-- Also update any other records to ensure consistency
UPDATE public.ad_mining_settings 
SET max_free_per_day = 50, updated_at = now()
WHERE max_free_per_day = 1;