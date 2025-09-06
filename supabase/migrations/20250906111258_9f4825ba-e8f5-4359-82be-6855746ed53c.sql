-- Enable realtime for INR funding related tables
ALTER TABLE public.fiat_settings_inr REPLICA IDENTITY FULL;
ALTER TABLE public.fiat_bank_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.fiat_upi_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.fiat_deposits REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fiat_settings_inr'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_settings_inr;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fiat_bank_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_bank_accounts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fiat_upi_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_upi_accounts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'fiat_deposits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fiat_deposits;
  END IF;
END;
$$;