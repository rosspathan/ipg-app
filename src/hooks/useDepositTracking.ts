/**
 * DEPRECATED: useDepositTracking
 * 
 * This hook is DISABLED as part of the server-side deposit hardening.
 * 
 * SECURITY: Deposits are now detected and credited exclusively by
 * the monitor-custodial-deposits server-side edge function.
 * Frontend CANNOT insert into custodial_deposits, wallet_balances,
 * or trading_balance_ledger (blocked by DB triggers).
 * 
 * Frontend should:
 * - Submit TX hash to server for tracking (optional)
 * - Show "Waiting for blockchain confirmation"
 * - Poll deposit status via custodial_deposits SELECT
 * 
 * DO NOT RE-ENABLE DIRECT DEPOSIT RECORDING.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';

interface DepositParams {
  asset_symbol: string;
  amount: number;
  tx_hash: string;
  network: string;
}

export const useDepositTracking = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const recordDeposit = useCallback(async (params: DepositParams) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    try {
      const normalizedHash = params.tx_hash.trim().toLowerCase();

      // Check if deposit already detected by server
      const { data: existingDeposit } = await supabase
        .from('custodial_deposits')
        .select('id, status, amount')
        .eq('tx_hash', normalizedHash)
        .maybeSingle();

      if (existingDeposit) {
        toast({
          title: "Deposit Found",
          description: `Status: ${existingDeposit.status}. ${existingDeposit.status === 'credited' ? 'Balance already updated.' : 'Waiting for confirmation...'}`,
        });
        return existingDeposit as any;
      }

      // No direct insert — server-side monitor will detect the on-chain transfer.
      // We only notify the user to wait.
      toast({
        title: "Deposit Submitted",
        description: `Your deposit will be detected automatically once confirmed on-chain. This may take a few minutes.`,
      });

      return { tx_hash: normalizedHash, status: 'waiting_for_detection' };
    } catch (error: any) {
      console.error('Deposit tracking error:', error);
      toast({
        title: "Error",
        description: error.message || "Please try again or contact support",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  return { recordDeposit, loading };
};
