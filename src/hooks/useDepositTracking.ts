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
      // Get asset ID from symbol
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('id')
        .eq('symbol', params.asset_symbol)
        .eq('is_active', true)
        .single();

      if (assetError || !asset) {
        throw new Error(`Asset ${params.asset_symbol} not found or inactive`);
      }

      // Create deposit record
      const { data: deposit, error: depositError } = await supabase
        .from('deposits')
        .insert({
          user_id: user.id,
          asset_id: asset.id,
          amount: params.amount,
          tx_hash: params.tx_hash,
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
