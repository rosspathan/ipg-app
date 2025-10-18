-- Add bonus breakdown columns to bsk_manual_purchase_requests
ALTER TABLE public.bsk_manual_purchase_requests
ADD COLUMN IF NOT EXISTS withdrawable_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS holding_bonus_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_received numeric DEFAULT 0;

-- Update existing records to set withdrawable_amount = purchase_amount
UPDATE public.bsk_manual_purchase_requests
SET withdrawable_amount = purchase_amount,
    holding_bonus_amount = purchase_amount * 0.5,
    total_received = purchase_amount * 1.5
WHERE withdrawable_amount IS NULL OR withdrawable_amount = 0;

COMMENT ON COLUMN public.bsk_manual_purchase_requests.withdrawable_amount IS 'BSK amount credited to withdrawable balance (equals purchase_amount)';
COMMENT ON COLUMN public.bsk_manual_purchase_requests.holding_bonus_amount IS 'BSK bonus credited to holding balance (+50% of purchase)';
COMMENT ON COLUMN public.bsk_manual_purchase_requests.total_received IS 'Total BSK user receives (withdrawable + holding bonus)';