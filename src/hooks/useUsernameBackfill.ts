/**
 * useUsernameBackfill
 * Ensures username is saved to profiles.username on first load
 * Part of the Username+Wallet patch
 */

import { useEffect } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { extractUsernameFromEmail } from "@/lib/user/username";
import { supabase } from "@/integrations/supabase/client";

export function useUsernameBackfill() {
  const { user } = useAuthUser();

  useEffect(() => {
    const backfill = async () => {
      if (!user?.email) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, email')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('[USERNAME_BACKFILL] profile select error:', error.message);
        }

        const currentUsername = (data as any)?.username;

        // Masked email log only
        const maskedEmail = user.email.slice(0, 2) + '***@' + user.email.split('@')[1];
        console.info('[USR_PREFLIGHT]', { email: maskedEmail, username: currentUsername || '—' });

        const username = extractUsernameFromEmail(user.email, user.id);
        const needsBackfill = !data || !currentUsername || currentUsername === 'User';
        
        if (!data) {
          // Ensure profile row exists, set username atomically
          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert({ user_id: user.id, email: user.email, username, account_status: 'active' }, { onConflict: 'user_id' });
          if (upsertErr) {
            console.warn('[USERNAME_BACKFILL] upsert failed:', upsertErr.message);
          } else {
            console.info('[USERNAME_BACKFILL] Upserted profile with username:', username.slice(0, 4) + '***');
            window.dispatchEvent(new Event('profile:updated'));
          }
        } else if (needsBackfill) {
          const { error: updErr } = await supabase
            .from('profiles')
            .update({ username })
            .eq('user_id', user.id);
          if (updErr) {
            console.warn('[USERNAME_BACKFILL] update failed:', updErr.message);
          } else {
            console.info('[USERNAME_BACKFILL] Set username:', username.slice(0, 4) + '***');
            window.dispatchEvent(new Event('profile:updated'));
          }
        }
      } catch (err) {
        console.warn('[USERNAME_BACKFILL] Failed:', err);
      }
    };

    backfill();
  }, [user?.email, user?.id]);
}
