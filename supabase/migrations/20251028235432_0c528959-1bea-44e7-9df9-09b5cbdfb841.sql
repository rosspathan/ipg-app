-- Ensure realtime emits old rows for DELETE events on deposits
ALTER TABLE public.deposits REPLICA IDENTITY FULL;

-- Add deposits table to realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'deposits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deposits;
  END IF;
END $$;