-- Migrate lucky draw system from INR to BSK

-- Update draw_configs table: rename ticket_price_inr to ticket_price_bsk
ALTER TABLE public.draw_configs 
RENAME COLUMN ticket_price_inr TO ticket_price_bsk;

-- Update draw_prizes table: rename amount_inr to amount_bsk
ALTER TABLE public.draw_prizes 
RENAME COLUMN amount_inr TO amount_bsk;

-- Update draw_templates table: rename ticket_price_inr to ticket_price_bsk
ALTER TABLE public.draw_templates 
RENAME COLUMN ticket_price_inr TO ticket_price_bsk;

-- Add comments to clarify the changes
COMMENT ON COLUMN public.draw_configs.ticket_price_bsk IS 'Ticket price in BSK (not INR)';
COMMENT ON COLUMN public.draw_prizes.amount_bsk IS 'Prize amount in BSK (not INR). Admin fee is deducted from this amount before awarding to winners.';
COMMENT ON COLUMN public.draw_templates.ticket_price_bsk IS 'Template ticket price in BSK (not INR)';
COMMENT ON COLUMN public.draw_configs.fee_percent IS 'Admin fee percentage deducted from each winner''s prize amount (not from total pool)';