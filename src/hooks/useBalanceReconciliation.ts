import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

interface ReconciliationResult {
  success: boolean;
  reconciled: boolean;
  discrepancy?: number;
  previous_locked?: number;
  new_locked?: number;
  message?: string;
  error?: string;
}

interface FixResult {
  success: boolean;
  fixed_count: number;
}

interface IntegrityResult {
  user_id: string;
  has_issues: boolean;
  issue_count: number;
  issues: Array<{
    asset: string;
    issue: string;
    value?: number;
    current_locked?: number;
    expected_locked?: number;
    discrepancy?: number;
  }>;
}

/**
 * Hook to reconcile user's locked trading balances
 * Uses the new atomic database functions for reliability
 */
export function useBalanceReconciliation() {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isReconciling, setIsReconciling] = useState(false);

  const invalidateAllBalanceQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
    queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
    queryClient.invalidateQueries({ queryKey: ['user-balance'] });
    queryClient.invalidateQueries({ queryKey: ['transfer-assets'] });
    queryClient.invalidateQueries({ queryKey: ['trading-balances'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  /**
   * Check balance integrity - identifies issues without fixing them
   */
  const checkIntegrity = async (): Promise<IntegrityResult | null> => {
    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to check balance integrity",
        variant: "destructive",
      });
      return null;
    }

    try {
      console.log('[BalanceReconciliation] Checking integrity for user:', user.id);

      const { data, error } = await supabase.rpc('check_balance_integrity', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('[BalanceReconciliation] Integrity check error:', error);
        throw new Error(error.message);
      }

      const result = data as unknown as IntegrityResult;
      console.log('[BalanceReconciliation] Integrity result:', result);

      return result;
    } catch (error: any) {
      console.error('[BalanceReconciliation] Error:', error);
      toast({
        title: "Integrity Check Failed",
        description: error.message || "Failed to check balance integrity",
        variant: "destructive",
      });
      return null;
    }
  };

  /**
   * Fix all balance issues for the user
   */
  const reconcileBalances = async (): Promise<FixResult | null> => {
    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to reconcile balances",
        variant: "destructive",
      });
      return null;
    }

    setIsReconciling(true);

    try {
      console.log('[BalanceReconciliation] Starting full reconciliation for user:', user.id);

      const { data, error } = await supabase.rpc('force_fix_user_balances', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('[BalanceReconciliation] Fix error:', error);
        throw new Error(error.message);
      }

      const result = data as unknown as FixResult;
      console.log('[BalanceReconciliation] Fix result:', result);

      // Invalidate all balance-related queries
      invalidateAllBalanceQueries();

      // Show result
      if (result.fixed_count > 0) {
        toast({
          title: "Balances Fixed",
          description: `Corrected ${result.fixed_count} balance discrepancy(ies)`,
        });
      } else {
        toast({
          title: "Balances OK",
          description: "No discrepancies found - all balances are correct",
        });
      }

      return result;
    } catch (error: any) {
      console.error('[BalanceReconciliation] Error:', error);
      toast({
        title: "Reconciliation Failed",
        description: error.message || "Failed to reconcile balances",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsReconciling(false);
    }
  };

  /**
   * Reconcile a single asset's balance
   */
  const reconcileSingleAsset = async (assetSymbol: string): Promise<ReconciliationResult | null> => {
    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to reconcile balances",
        variant: "destructive",
      });
      return null;
    }

    setIsReconciling(true);

    try {
      console.log('[BalanceReconciliation] Reconciling single asset:', assetSymbol);

      const { data, error } = await supabase.rpc('reconcile_locked_balance', {
        p_user_id: user.id,
        p_asset_symbol: assetSymbol,
      });

      if (error) {
        console.error('[BalanceReconciliation] RPC error:', error);
        throw new Error(error.message);
      }

      const result = data as unknown as ReconciliationResult;
      console.log('[BalanceReconciliation] Result:', result);

      // Invalidate all balance-related queries
      invalidateAllBalanceQueries();

      if (result.reconciled) {
        toast({
          title: "Balance Corrected",
          description: `${assetSymbol}: Released ${Math.abs(result.discrepancy || 0).toFixed(8)} from locked`,
        });
      } else {
        toast({
          title: "Balance OK",
          description: `${assetSymbol} balance is correct`,
        });
      }

      return result;
    } catch (error: any) {
      console.error('[BalanceReconciliation] Error:', error);
      toast({
        title: "Reconciliation Failed",
        description: error.message || "Failed to reconcile balance",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsReconciling(false);
    }
  };

  return {
    checkIntegrity,
    reconcileBalances,
    reconcileSingleAsset,
    isReconciling,
  };
}
