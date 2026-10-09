import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { hasStoredWallet } from '@/utils/walletStorage';

/**
 * useExistingWallet - Detects whether the signed-in user already has a wallet.
 *
 * Checks (in order, any hit counts):
 * 1. Local device wallet storage
 * 2. profiles.wallet_address
 * 3. user_wallets table
 *
 * Used to hide/block "Create New Wallet" UI for users who already have one,
 * so an account can never end up with a second wallet through the app.
 */
export function useExistingWallet() {
  const { user, loading: authLoading } = useAuthUser();
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setHasWallet(false);
      return;
    }

    // Fast path: wallet stored locally on this device
    if (hasStoredWallet(user.id)) {
      setHasWallet(true);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const [profileResult, walletResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('wallet_address')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_wallets')
            .select('wallet_address')
            .eq('user_id', user.id)
            .maybeSingle(),
        ]);

        if (cancelled) return;
        setHasWallet(
          Boolean(profileResult.data?.wallet_address) ||
          Boolean(walletResult.data?.wallet_address)
        );
      } catch (error) {
        console.error('[useExistingWallet] Check failed:', error);
        if (!cancelled) setHasWallet(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return {
    /** null = still checking */
    hasWallet,
    isChecking: hasWallet === null,
  };
}
