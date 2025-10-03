-- Add fee configuration to BSK purchase settings
ALTER TABLE public.bsk_purchase_settings
ADD COLUMN fee_percent NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN fee_fixed NUMERIC NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.bsk_purchase_settings.fee_percent IS 'Percentage fee charged on purchase amount';
COMMENT ON COLUMN public.bsk_purchase_settings.fee_fixed IS 'Fixed fee amount charged on purchase';