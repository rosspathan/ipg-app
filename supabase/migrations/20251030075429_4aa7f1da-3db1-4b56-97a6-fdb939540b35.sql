-- Ensure price_bsk is never null on user_badge_holdings updates/inserts
-- 1) Create a trigger function that fills price_bsk from latest badge_purchase_events or 0
CREATE OR REPLACE FUNCTION public.set_user_badge_holdings_price_bsk()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric;
BEGIN
  IF NEW.price_bsk IS NULL THEN
    SELECT e.paid_amount_bsk
      INTO v_paid
    FROM public.badge_purchase_events e
    WHERE e.user_id = NEW.user_id
    ORDER BY e.occurred_at DESC
    LIMIT 1;

    NEW.price_bsk := COALESCE(v_paid, 0);
  END IF;

  RETURN NEW;
END;
$$;

-- 2) Create trigger to apply the function on insert/update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_set_price_bsk_on_user_badge_holdings'
  ) THEN
    CREATE TRIGGER trg_set_price_bsk_on_user_badge_holdings
    BEFORE INSERT OR UPDATE ON public.user_badge_holdings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_user_badge_holdings_price_bsk();
  END IF;
END $$;

-- 3) One-time safety backfill: set any NULL price_bsk to 0 or from latest event
UPDATE public.user_badge_holdings
SET price_bsk = COALESCE(
  (
    SELECT e.paid_amount_bsk
    FROM public.badge_purchase_events e
    WHERE e.user_id = user_badge_holdings.user_id
    ORDER BY e.occurred_at DESC
    LIMIT 1
  ), 
  0
)
WHERE price_bsk IS NULL;