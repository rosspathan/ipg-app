-- Delete all pending KYC reviews (submitted, pending, in_review statuses)
DELETE FROM kyc_profiles_new
WHERE status IN ('submitted', 'pending', 'in_review');