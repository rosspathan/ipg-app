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
        // Check current username in profiles
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', user.id)
          .maybeSingle();

        const needsBackfill = !data || !(data as any).username || (data as any).username === 'User';
        
        if (needsBackfill) {
          const username = extractUsernameFromEmail(user.email, user.id);
          
          await supabase
            .from('profiles')
            .update({ username })
            .eq('user_id', user.id);

          console.info('[USERNAME_BACKFILL] Set username:', username.slice(0, 4) + '***');
        }
      } catch (err) {
        console.warn('[USERNAME_BACKFILL] Failed:', err);
      }
    };

    backfill();
  }, [user?.email, user?.id]);
}
