-- Add fee configuration to BSK bonus campaigns
ALTER TABLE public.bsk_bonus_campaigns
ADD COLUMN fee_percent NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN fee_fixed NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bsk_bonus_campaigns.fee_percent IS 'Percentage fee charged on purchase amount';
COMMENT ON COLUMN public.bsk_bonus_campaigns.fee_fixed IS 'Fixed fee amount charged per purchase';