-- Remove KYC enforcement trigger from badge purchases
-- The edge function already logs KYC status as a warning, no need to block purchases

DROP TRIGGER IF EXISTS enforce_kyc_before_badge_purchase ON public.badge_purchases;