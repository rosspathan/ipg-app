import { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BalanceIssue {
  asset: string;
  locked: number;
  openOrdersCount: number;
}

/**
 * Hook that automatically detects and heals orphaned locked balances.
 * If a user has locked balance but no corresponding open orders,
 * it will automatically trigger reconciliation.
 */
export const useAutoHealBalance = () => {
  const queryClient = useQueryClient();
  const [isHealing, setIsHealing] = useState(false);
  const [hasIssues, setHasIssues] = useState(false);

  // Check for balance integrity issues
  const { data: integrityCheck, refetch: recheckIntegrity } = useQuery({
    queryKey: ['balance-integrity-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's locked balances
      const { data: balances } = await supabase
        .from('wallet_balances')
        .select(`
          available,
          locked,
          asset:assets(symbol)
        `)
        .eq('user_id', user.id)
        .gt('locked', 0.00000001);

      if (!balances || balances.length === 0) {
        return { hasIssues: false, issues: [] };
      }

      // Get user's open orders
      const { data: openOrders } = await supabase
        .from('orders')
        .select('id, symbol, side, remaining_amount, price')
        .eq('user_id', user.id)
        .in('status', ['pending', 'partially_filled']);

      const issues: BalanceIssue[] = [];

      for (const balance of balances) {
        const assetSymbol = (balance.asset as any)?.symbol;
        if (!assetSymbol) continue;

        // Count open orders that should have locked this asset
        const relevantOrders = (openOrders || []).filter(order => {
          const [base, quote] = order.symbol.split('/');
          if (order.side === 'buy' && quote === assetSymbol) return true;
          if (order.side === 'sell' && base === assetSymbol) return true;
          return false;
        });

        // If locked > 0 but no relevant open orders, it's an orphan
        if (balance.locked > 0.00000001 && relevantOrders.length === 0) {
          issues.push({
            asset: assetSymbol,
            locked: balance.locked,
            openOrdersCount: 0
          });
        }
      }

      return {
        hasIssues: issues.length > 0,
        issues
      };
    },
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000,
  });

  useEffect(() => {
    setHasIssues(integrityCheck?.hasIssues || false);
  }, [integrityCheck]);

  // Auto-heal function
  const healBalance = useCallback(async () => {
    if (isHealing) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsHealing(true);

    try {
      // Call the force_fix_user_balances RPC
      const { data, error } = await supabase.rpc('force_fix_user_balances', {
        p_user_id: user.id
      });

      if (error) {
        console.error('[auto-heal] RPC error:', error);
        toast.error('Failed to repair balance');
        return;
      }

      const result = data as any;
      
      if (result?.fixed_count > 0) {
        toast.success('Balance repaired', {
          description: `Fixed ${result.fixed_count} balance discrepancy(ies)`,
        });
        
        // Invalidate all balance-related queries
        queryClient.invalidateQueries({ queryKey: ['user-balance'] });
        queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
        queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
        queryClient.invalidateQueries({ queryKey: ['balance-integrity-check'] });
      } else {
        toast.info('No issues found', {
          description: 'Your balance is consistent',
        });
      }

      setHasIssues(false);
    } catch (err) {
      console.error('[auto-heal] Error:', err);
      toast.error('Balance repair failed');
    } finally {
      setIsHealing(false);
    }
  }, [isHealing, queryClient]);

  // Auto-trigger healing if issues detected and user on relevant page
  useEffect(() => {
    if (hasIssues && integrityCheck?.issues && integrityCheck.issues.length > 0) {
      console.warn('[auto-heal] Orphaned locks detected:', integrityCheck.issues);
      
      // Show warning toast with repair option
      toast.warning('Balance discrepancy detected', {
        description: `You have ${integrityCheck.issues.length} locked balance(s) without matching orders.`,
        action: {
          label: 'Repair Now',
          onClick: healBalance
        },
        duration: 10000,
      });
    }
  }, [hasIssues, integrityCheck, healBalance]);

  return {
    hasIssues,
    issues: integrityCheck?.issues || [],
    isHealing,
    healBalance,
    recheckIntegrity,
  };
};
