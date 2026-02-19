-- Fix INSERT policy to only allow service role (not any user) 
-- The trigger runs as SECURITY DEFINER so it bypasses RLS — this is correct
-- We restrict INSERT to service role by removing the permissive WITH CHECK (true) policy
-- and relying on SECURITY DEFINER trigger + service role direct inserts

DROP POLICY IF EXISTS "Service can insert notifications" ON public.user_notifications;

-- Only allow INSERT via service role (edge functions) — done via SECURITY DEFINER trigger.
-- No public INSERT policy needed since users don't need to insert notifications.
-- The trigger function is SECURITY DEFINER and bypasses RLS.
