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
      // Normalize tx hash and de-duplicate existing records
      const normalizedHash = params.tx_hash.trim().toLowerCase();

      // Check for existing deposit with same tx_hash for this user
      const { data: existingDeposit, error: existingError } = await supabase
        .from('deposits')
        .select('id')
        .eq('user_id', user.id)
        .eq('tx_hash', normalizedHash)
        .single();

      if (existingDeposit) {
        // Resume monitoring existing record
        try {
          await supabase.functions.invoke('monitor-deposit', {
            body: { deposit_id: existingDeposit.id }
          });
        } catch (fnError) {
          console.warn('Monitor deposit function not available:', fnError);
        }

        toast({
          title: "Already Tracked",
          description: `We found your deposit. Monitoring confirmations now...`,
        });
        return existingDeposit as any;
      }

      // Get asset ID from symbol (prefer network match)
      let assetId: string | null = null;
      let { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('id')
        .eq('symbol', params.asset_symbol)
        .eq('is_active', true)
        .eq('network', params.network)
        .single();

      if (assetError || !asset) {
        // Fallback without network filter
        const { data: assetFallback, error: fallbackError } = await supabase
          .from('assets')
          .select('id')
          .eq('symbol', params.asset_symbol)
          .eq('is_active', true)
          .single();

        if (fallbackError || !assetFallback) {
          throw new Error(`Asset ${params.asset_symbol} not found or inactive`);
        }
        assetId = assetFallback.id;
      } else {
        assetId = asset.id;
      }

      // Create deposit record
      const { data: deposit, error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          asset_id: assetId!,
          amount: params.amount,
          tx_hash: normalizedHash,
          network: params.network,
          status: 'pending',
          confirmations: 0,
          required_confirmations: 12
        })
        .select()
        .single();

      if (depositError) throw depositError;

      // Trigger monitoring via edge function (optional - for production)
      try {
        await supabase.functions.invoke('monitor-deposit', {
          body: { deposit_id: deposit.id }
        });
      } catch (fnError) {
        console.warn('Monitor deposit function not available:', fnError);
      }

      toast({
        title: "Deposit Detected",
        description: `Monitoring ${params.amount} ${params.asset_symbol}. Confirmations: 0/12`,
      });

      return deposit;
    } catch (error: any) {
      console.error('Deposit tracking error:', error);
      toast({
        title: "Deposit Recording Failed",
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
