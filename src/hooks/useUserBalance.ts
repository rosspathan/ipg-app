import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserBalance = (assetSymbol?: string, showAllAssets = false) => {
  return useQuery({
    queryKey: ['user-balance', assetSymbol, showAllAssets],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (showAllAssets) {
        // Fetch ALL withdrawal-enabled crypto assets with their balances
        let assetQuery = supabase
          .from('assets')
          .select('id, symbol, name, logo_url, network, withdraw_enabled, withdraw_fee')
          .eq('withdraw_enabled', true)
          .neq('network', 'fiat')
          .neq('network', 'FIAT')
          .order('symbol');

        if (assetSymbol) {
          assetQuery = assetQuery.eq('symbol', assetSymbol);
        }

        const { data: assets, error: assetError } = await assetQuery;
        if (assetError) throw assetError;

        // Fetch user balances
        const { data: balances } = await supabase
          .from('wallet_balances')
          .select('asset_id, available, locked, total')
          .eq('user_id', user.id);

        // Create balance lookup map
        const balanceMap = new Map(
          (balances || []).map((b: any) => [b.asset_id, b])
        );

        // Merge assets with balances (show 0 if no balance)
        return (assets || []).map((asset: any) => {
          const balance = balanceMap.get(asset.id);
          return {
            symbol: asset.symbol,
            name: asset.name,
            balance: balance ? parseFloat(balance.total) : 0,
            available: balance ? parseFloat(balance.available) : 0,
            locked: balance ? parseFloat(balance.locked) : 0,
            logo_url: asset.logo_url,
            network: asset.network,
            withdraw_fee: asset.withdraw_fee,
          };
        });
      }

      // Original implementation for specific balance queries
      let query = supabase
        .from('wallet_balances')
        .select(`
          *,
          assets:asset_id (symbol, name, logo_url, network, withdraw_fee)
        `)
        .eq('user_id', user.id);

      // Filter by specific asset if provided
      if (assetSymbol) {
        const { data: asset } = await supabase
          .from('assets')
          .select('id')
          .eq('symbol', assetSymbol)
          .single();
        
        if (asset) {
          query = query.eq('asset_id', asset.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data to match expected format
      return (data || []).map((balance: any) => ({
        symbol: balance.assets.symbol,
        name: balance.assets.name,
        balance: parseFloat(balance.total),
        available: parseFloat(balance.available),
        locked: parseFloat(balance.locked),
        logo_url: balance.assets.logo_url,
        network: balance.assets?.network,
        withdraw_fee: balance.assets?.withdraw_fee,
      }));
    },
  });
};
