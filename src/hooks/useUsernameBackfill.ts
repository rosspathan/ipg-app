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
        const { data } = await supabase
          .from('profiles')
          .select('username, wallet_addresses, email')
          .eq('user_id', user.id)
          .maybeSingle();

        const currentUsername = (data as any)?.username;
        const walletAddresses = (data as any)?.wallet_addresses;

        // Pre-flight masked console snapshot
        const maskedEmail = user.email.slice(0, 2) + '***@' + user.email.split('@')[1];
        const maskedAddr = walletAddresses?.evm
          ? (walletAddresses.evm.bsc || walletAddresses.evm.mainnet || walletAddresses.evm)
          : null;
        const maskedEvm = typeof maskedAddr === 'string' && maskedAddr.startsWith('0x')
          ? maskedAddr.slice(0, 6) + '...' + maskedAddr.slice(-4)
          : 'none';
        console.info('[USR_PREFLIGHT]', { email: maskedEmail, username: currentUsername || '—', evm: maskedEvm });

        const needsBackfill = !data || !currentUsername || currentUsername === 'User';
        
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
