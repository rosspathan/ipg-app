-- Add documentation for lucky draw admin fee behavior
-- Admin fee is deducted from each winner's prize amount, not from the total pool

COMMENT ON COLUMN public.draw_prizes.amount_bsk IS 'Prize amount in BSK. Admin fee is deducted from this amount before awarding to winner.';
COMMENT ON COLUMN public.draw_configs.fee_percent IS 'Admin fee percentage deducted from each winner''s prize amount (not from total pool)';