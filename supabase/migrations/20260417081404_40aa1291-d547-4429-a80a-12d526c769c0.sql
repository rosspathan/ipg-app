DROP VIEW IF EXISTS public.bsk_migrations_stuck_view;

CREATE VIEW public.bsk_migrations_stuck_view
WITH (security_invoker = true) AS
SELECT id, user_id, wallet_address, amount_requested, net_amount_migrated,
       status, tx_hash, debited_at, broadcasted_at, created_at,
       EXTRACT(epoch FROM (now() - created_at))/60 AS minutes_old
  FROM public.bsk_onchain_migrations
 WHERE status IN ('approved_executing', 'broadcasting', 'confirming')
   AND created_at < now() - interval '10 minutes';

GRANT SELECT ON public.bsk_migrations_stuck_view TO authenticated;