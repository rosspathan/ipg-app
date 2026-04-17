
-- ============================================================
-- FIX 1: profile_completion_new — remove permissive ALL policy
-- ============================================================
DROP POLICY IF EXISTS "System can manage profile completion" ON public.profile_completion_new;

-- Service role bypasses RLS automatically; add explicit owner-scoped write policies for users
CREATE POLICY "Users can insert own profile completion"
  ON public.profile_completion_new
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid())::text = (user_id)::text);

CREATE POLICY "Users can update own profile completion"
  ON public.profile_completion_new
  FOR UPDATE
  TO authenticated
  USING ((auth.uid())::text = (user_id)::text)
  WITH CHECK ((auth.uid())::text = (user_id)::text);

-- ============================================================
-- FIX 2: daily_reconciliation_snapshots — remove permissive policy
-- ============================================================
DROP POLICY IF EXISTS "Service role access snapshots" ON public.daily_reconciliation_snapshots;
DROP POLICY IF EXISTS "Service role only" ON public.daily_reconciliation_snapshots;

-- Admins can view; service role bypasses RLS for writes
CREATE POLICY "Admins can view reconciliation snapshots"
  ON public.daily_reconciliation_snapshots
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- FIX 3: user_badge_status — remove public SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can view badge status" ON public.user_badge_status;
-- "Owner or admin can view badge status" already exists and is correct.

-- ============================================================
-- FIX 4: realtime.messages — restrict channel subscriptions to authenticated
-- ============================================================
-- Enable RLS and require authenticated users; postgres_changes are still gated by per-table RLS.
-- This prevents anonymous broadcast/presence eavesdropping.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can receive realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can receive realtime messages"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can send realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can send realtime messages"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- FIX 5: Public storage buckets — prevent listing via storage API
-- Public buckets are served via CDN which does not require RLS.
-- Removing the broad SELECT policies stops the storage list/search endpoints
-- from enumerating all objects, while CDN URLs continue to work.
-- ============================================================
DROP POLICY IF EXISTS "Public assets are viewable by everyone" ON storage.objects;
DROP POLICY IF EXISTS "Public can view ad images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view ad media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can view crypto logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can view crypto-logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view program assets" ON storage.objects;
