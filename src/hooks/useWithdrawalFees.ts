import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NetworkFee {
  networkFee: string;
  platformFee: string;
  totalFee: number;
  estimatedTime: string;
}

export function useWithdrawalFees(assetSymbol: string, network: string) {
  const [fees, setFees] = useState<NetworkFee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFees = async () => {
      try {
        const { data: asset } = await supabase
          .from('assets')
          .select('withdraw_fee, symbol')
          .eq('symbol', assetSymbol)
          .single();

        if (asset) {
          const withdrawFee = parseFloat(String(asset.withdraw_fee || 0));
          const platformFee = withdrawFee * 0.1; // 10% platform fee
          const networkFee = withdrawFee * 0.9; // 90% network fee

          const estimatedTimes: Record<string, string> = {
            'Bitcoin': '30-60 minutes',
            'Ethereum': '5-15 minutes',
            'BEP20': '3-5 minutes',
            'Tron': '1-3 minutes'
          };

          setFees({
            networkFee: networkFee.toFixed(8),
            platformFee: platformFee.toFixed(8),
            totalFee: withdrawFee,
            estimatedTime: estimatedTimes[network] || '5-30 minutes'
          });
        }
      } catch (error) {
        console.error('Failed to fetch withdrawal fees:', error);
      } finally {
        setLoading(false);
      }
    };

    if (assetSymbol && network) {
      fetchFees();
    }
  }, [assetSymbol, network]);

  return { fees, loading };
}
