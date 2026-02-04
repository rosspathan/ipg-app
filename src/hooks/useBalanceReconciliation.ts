import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

interface BalanceDiscrepancy {
  asset_symbol: string;
  actual_locked: number;
  expected_locked: number;
  discrepancy: number;
}

/**
 * Hook to detect balance discrepancies between locked amounts and open orders.
 * This helps identify "ghost locks" where funds are locked but no orders exist.
 */
export function useBalanceReconciliation() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['balance-reconciliation', user?.id],
    queryFn: async (): Promise<BalanceDiscrepancy[]> => {
      if (!user?.id) return [];

      // Get all user's locked balances
      const { data: balances, error: balError } = await supabase
        .from('wallet_balances')
        .select(`
          asset_id,
          locked,
          assets (symbol)
        `)
        .eq('user_id', user.id)
        .gt('locked', 0.00001);

      if (balError) {
        console.error('[useBalanceReconciliation] Balance fetch error:', balError);
        return [];
      }

      // Get sum of locked amounts from active orders
      const { data: orders, error: orderError } = await supabase
        .from('orders')
        .select('locked_asset_symbol, locked_amount')
        .eq('user_id', user.id)
        .in('status', ['pending', 'open', 'partially_filled'])
        .gt('locked_amount', 0);

      if (orderError) {
        console.error('[useBalanceReconciliation] Orders fetch error:', orderError);
        return [];
      }

      // Aggregate expected locks by asset
      const expectedLocks: Record<string, number> = {};
      (orders || []).forEach(o => {
        if (o.locked_asset_symbol) {
          expectedLocks[o.locked_asset_symbol] = (expectedLocks[o.locked_asset_symbol] || 0) + Number(o.locked_amount || 0);
        }
      });

      // Compare and find discrepancies
      const discrepancies: BalanceDiscrepancy[] = [];
      
      (balances || []).forEach(b => {
        const asset = b.assets as { symbol: string } | null;
        if (!asset?.symbol) return;
        
        const actualLocked = Number(b.locked) || 0;
        const expectedLocked = expectedLocks[asset.symbol] || 0;
        const diff = actualLocked - expectedLocked;
        
        if (Math.abs(diff) > 0.00001) {
          discrepancies.push({
            asset_symbol: asset.symbol,
            actual_locked: actualLocked,
            expected_locked: expectedLocked,
            discrepancy: diff
          });
        }
      });

      return discrepancies;
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Check every minute
  });
}

/**
 * Hook to check if user has any locked balance but no open orders
 * (simplified version for UI warnings)
 */
export function useHasGhostLocks() {
  const { data: discrepancies, isLoading } = useBalanceReconciliation();
  
  const hasGhostLocks = (discrepancies || []).some(d => d.discrepancy > 0.00001);
  const totalGhostLocked = (discrepancies || []).reduce((sum, d) => sum + Math.max(0, d.discrepancy), 0);
  
  return {
    hasGhostLocks,
    totalGhostLocked,
    discrepancies: discrepancies || [],
    isLoading
  };
}
