import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface AssetBalance {
  asset_id: string;
  symbol: string;
  name: string;
  balance: number;
  available: number;
  locked: number;
  usd_value: number;
  price_usd: number;
  logo_url?: string;
}

export interface PortfolioSummary {
  total_usd: number;
  change_24h_percent: number;
  available_usd: number;
  locked_usd: number;
}

export function useWalletBalances() {
  const { user } = useAuthUser();
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch user's wallet balances with asset details
      const { data: balanceData, error: balanceError } = await supabase
        .from('wallet_balances')
        .select(`
          balance,
          available,
          locked,
          asset_id,
          assets (
            symbol,
            name,
            logo_url,
            initial_price
          )
        `)
        .eq('user_id', user.id)
        .gt('balance', 0); // Only show non-zero balances

      if (balanceError) throw balanceError;

      // Get crypto prices from edge function
      const { data: priceData, error: priceError } = await supabase.functions.invoke('get-crypto-prices', {
        body: { 
          symbols: balanceData?.map((b: any) => b.assets.symbol) || [] 
        }
      });

      if (priceError) {
        console.warn('Failed to fetch live prices, using fallback:', priceError);
      }

      // Calculate balances with USD values
      const enrichedBalances: AssetBalance[] = (balanceData || []).map((item: any) => {
        const asset = item.assets;
        const priceUsd = priceData?.prices?.[asset.symbol] || asset.initial_price || 0;
        const usdValue = item.balance * priceUsd;

        return {
          asset_id: item.asset_id,
          symbol: asset.symbol,
          name: asset.name,
          balance: item.balance,
          available: item.available,
          locked: item.locked,
          usd_value: usdValue,
          price_usd: priceUsd,
          logo_url: asset.logo_url
        };
      });

      // Calculate portfolio summary
      const totalUsd = enrichedBalances.reduce((sum, b) => sum + b.usd_value, 0);
      const availableUsd = enrichedBalances.reduce((sum, b) => sum + (b.available * b.price_usd), 0);
      const lockedUsd = enrichedBalances.reduce((sum, b) => sum + (b.locked * b.price_usd), 0);

      // Mock 24h change for now - would come from price history
      const change24hPercent = priceData?.change_24h || 0;

      setBalances(enrichedBalances);
      setPortfolio({
        total_usd: totalUsd,
        change_24h_percent: change24hPercent,
        available_usd: availableUsd,
        locked_usd: lockedUsd
      });
    } catch (err: any) {
      console.error('Error fetching wallet balances:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();

    // Poll for price updates every 30 seconds
    const interval = setInterval(() => {
      fetchBalances();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  return {
    balances,
    portfolio,
    loading,
    error,
    refetch: fetchBalances
  };
}
