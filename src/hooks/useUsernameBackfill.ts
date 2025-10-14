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
      if (!user?.email || !user?.id) {
        console.warn('[USERNAME_BACKFILL] No user email or id');
        return;
      }

      const username = extractUsernameFromEmail(user.email, user.id);
      console.info('[USERNAME_BACKFILL] Starting backfill for user:', user.id.slice(0, 8), 'username:', username);

      try {
        // First, try to upsert the profile with the correct username
        const { data: upsertData, error: upsertErr } = await supabase
          .from('profiles')
          .upsert(
            { 
              id: user.id, 
              email: user.email, 
              username,
              account_status: 'active',
              referral_code: user.id.substring(0, 8).toUpperCase()
            },
            { 
              onConflict: 'id',
              ignoreDuplicates: false 
            }
          )
          .select('username')
          .single();

        if (upsertErr) {
          console.error('[USERNAME_BACKFILL] Upsert failed:', upsertErr.message);
        } else {
          console.info('[USERNAME_BACKFILL] ✓ Profile upserted with username:', upsertData?.username || username);
          // Force UI refresh
          window.dispatchEvent(new Event('profile:updated'));
        }
      } catch (err) {
        console.error('[USERNAME_BACKFILL] Exception:', err);
      }
    };

    // Run immediately and log
    console.info('[USERNAME_BACKFILL] Hook mounted');
    backfill();
  }, [user?.email, user?.id]);
}
