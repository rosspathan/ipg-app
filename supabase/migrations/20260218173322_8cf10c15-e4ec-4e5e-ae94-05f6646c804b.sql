-- Deactivate the unknown wallet
UPDATE platform_hot_wallet
SET is_active = false, updated_at = NOW()
WHERE address = '0x26CdD408D16E3C47F08ee3222f9CA765D5e5aD88';

-- Reactivate the original trading hot wallet
UPDATE platform_hot_wallet
SET is_active = true, updated_at = NOW()
WHERE address = '0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5';