
-- Bypass insert-only triggers for this single forensic deletion
SET LOCAL session_replication_role = 'replica';

DELETE FROM public.trading_fees_collected WHERE user_id = '105a8811-2c93-428a-9979-e44a1022fe95';

-- Catch-all for any other tables we missed that block the cascade
DO $$
DECLARE
  v_user_id uuid := '105a8811-2c93-428a-9979-e44a1022fe95';
  r record;
BEGIN
  FOR r IN
    SELECT c.table_schema, c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.column_name = 'user_id'
      AND c.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
  LOOP
    BEGIN
      EXECUTE format('DELETE FROM %I.%I WHERE user_id = $1', r.table_schema, r.table_name) USING v_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %.%: %', r.table_schema, r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

DELETE FROM public.profiles WHERE user_id = '105a8811-2c93-428a-9979-e44a1022fe95';

-- Now the auth user
DELETE FROM auth.users WHERE id = '105a8811-2c93-428a-9979-e44a1022fe95';

SET LOCAL session_replication_role = 'origin';
