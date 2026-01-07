import { useState, useEffect } from 'react';
import { checkWalletIntegrity } from './evmAddress';

export interface WalletIntegrityState {
  loading: boolean;
  hasMismatch: boolean;
  profileWallet: string | null;
  bscWallet: string | null;
  backupWallet: string | null;
  mismatchType: 'profile_vs_backup' | 'profile_vs_bsc' | 'both' | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to check wallet integrity for a user
 * Detects mismatches between profile wallet, BSC wallet, and backup wallet
 */
export function useWalletIntegrity(userId: string | null): WalletIntegrityState {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<Omit<WalletIntegrityState, 'loading' | 'refetch'>>({
    hasMismatch: false,
    profileWallet: null,
    bscWallet: null,
    backupWallet: null,
    mismatchType: null
  });

  const fetchIntegrity = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await checkWalletIntegrity(userId);
      setState(result);
    } catch (error) {
      console.error('[useWalletIntegrity] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrity();
  }, [userId]);

  return {
    ...state,
    loading,
    refetch: fetchIntegrity
  };
}
