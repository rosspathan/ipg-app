-- Remove KYC enforcement trigger from user_badge_holdings
-- Badge purchases should only log KYC status as a warning, not block updates

DROP TRIGGER IF EXISTS enforce_kyc_before_badge_holding ON public.user_badge_holdings;