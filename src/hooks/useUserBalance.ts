import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useUserBalance = (assetSymbol?: string) => {
  return useQuery({
    queryKey: ['user-balance', assetSymbol],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Fetch real balances from wallet_balances table
      let query = supabase
        .from('wallet_balances')
        .select(`
          *,
          assets:asset_id (symbol, name, logo_url)
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
      }));
    },
  });
};
