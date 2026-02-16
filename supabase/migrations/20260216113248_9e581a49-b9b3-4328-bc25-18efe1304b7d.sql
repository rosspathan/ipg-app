
SELECT cron.schedule(
  'expire-stale-trading-orders',
  '0 */6 * * *',
  $$SELECT public.expire_stale_orders(72);$$
);
