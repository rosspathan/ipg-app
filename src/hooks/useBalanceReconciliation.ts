import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

interface ReconciliationResult {
  success: boolean;
  user_id: string;
  reconciled_assets: Array<{
    asset: string;
    old_locked: number;
    new_locked: number;
    released: number;
  }>;
}

/**
 * Hook to reconcile user's locked trading balances
 * This ensures locked amounts match actual open orders
 */
export function useBalanceReconciliation() {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isReconciling, setIsReconciling] = useState(false);

  const reconcileBalances = async (): Promise<ReconciliationResult | null> => {
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
      console.log('[ReconcileBalances] Starting reconciliation for user:', user.id);

      const { data, error } = await supabase.rpc('force_reconcile_all_balances', {
        p_user_id: user.id,
      });

      if (error) {
        console.error('[ReconcileBalances] RPC error:', error);
        throw new Error(error.message);
      }

      const result = data as unknown as ReconciliationResult;
      console.log('[ReconcileBalances] Result:', result);

      // Invalidate all balance-related queries
      queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-assets'] });

      // Show result
      if (result.reconciled_assets && result.reconciled_assets.length > 0) {
        const totalReleased = result.reconciled_assets.reduce((sum, a) => sum + a.released, 0);
        toast({
          title: "Balances Reconciled",
          description: `Released ${totalReleased.toFixed(4)} from locked across ${result.reconciled_assets.length} asset(s)`,
        });
      } else {
        toast({
          title: "Balances OK",
          description: "No discrepancies found - all balances are correct",
        });
      }

      return result;
    } catch (error: any) {
      console.error('[ReconcileBalances] Error:', error);
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

  const reconcileSingleAsset = async (assetSymbol: string): Promise<boolean> => {
    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to reconcile balances",
        variant: "destructive",
      });
      return false;
    }

    setIsReconciling(true);

    try {
      console.log('[ReconcileBalances] Reconciling single asset:', assetSymbol);

      const { error } = await supabase.rpc('reconcile_locked_balance', {
        p_user_id: user.id,
        p_asset_symbol: assetSymbol,
      });

      if (error) {
        console.error('[ReconcileBalances] RPC error:', error);
        throw new Error(error.message);
      }

      // Invalidate all balance-related queries
      queryClient.invalidateQueries({ queryKey: ['bep20-balances'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-balances'] });
      queryClient.invalidateQueries({ queryKey: ['user-balance'] });
      queryClient.invalidateQueries({ queryKey: ['transfer-assets'] });

      toast({
        title: "Balance Reconciled",
        description: `${assetSymbol} balance has been updated`,
      });

      return true;
    } catch (error: any) {
      console.error('[ReconcileBalances] Error:', error);
      toast({
        title: "Reconciliation Failed",
        description: error.message || "Failed to reconcile balance",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsReconciling(false);
    }
  };

  return {
    reconcileBalances,
    reconcileSingleAsset,
    isReconciling,
  };
}
