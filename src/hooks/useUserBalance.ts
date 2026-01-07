import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Fetch current crypto prices from Binance API + internal market prices
const fetchCryptoPrices = async (): Promise<Record<string, number>> => {
  const prices: Record<string, number> = { USDT: 1 };
  
  try {
    // Fetch Binance prices
    const response = await fetch('https://api.binance.com/api/v3/ticker/price');
    const data = await response.json();
    
    for (const ticker of data) {
      if (ticker.symbol.endsWith('USDT')) {
        const base = ticker.symbol.replace('USDT', '');
        prices[base] = parseFloat(ticker.price);
      }
    }
  } catch (error) {
    console.error('Failed to fetch Binance prices:', error);
  }
  
  // Fetch internal market prices for tokens not on Binance (IPG, BSK, etc.)
  try {
    const { data: internalPrices } = await supabase
      .from('market_prices')
      .select('symbol, current_price')
      .like('symbol', '%/USDT');
    
    for (const ip of internalPrices || []) {
      const baseSymbol = ip.symbol.split('/')[0];
      // Only add if not already in Binance prices
      if (!prices[baseSymbol] && ip.current_price) {
        prices[baseSymbol] = ip.current_price;
      }
    }
  } catch (error) {
    console.error('Failed to fetch internal market prices:', error);
  }
  
  return prices;
};

export const useUserBalance = (assetSymbol?: string, showAllAssets = false) => {
  return useQuery({
    queryKey: ['user-balance', assetSymbol, showAllAssets],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Return empty array instead of throwing - prevents logout on auth race conditions
      if (!user) {
        console.log('[useUserBalance] No user session - returning empty');
        return [];
      }

      // Fetch crypto prices for USD value calculation
      const prices = await fetchCryptoPrices();

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

        // Merge assets with balances (ALWAYS show all assets, even with 0 balance)
        return (assets || []).map((asset: any) => {
          const balance = balanceMap.get(asset.id);
          const totalBalance = balance ? parseFloat(balance.total) : 0;
          const priceUsd = prices[asset.symbol] || 0;
          
          return {
            symbol: asset.symbol,
            name: asset.name,
            balance: totalBalance,
            available: balance ? parseFloat(balance.available) : 0,
            locked: balance ? parseFloat(balance.locked) : 0,
            logo_url: asset.logo_url,
            network: asset.network,
            withdraw_fee: asset.withdraw_fee,
            asset_id: asset.id,
            price_usd: priceUsd,
            usd_value: totalBalance * priceUsd,
          };
        });
      }

      // Original implementation for specific balance queries
      let query = supabase
        .from('wallet_balances')
        .select(`
          *,
          assets:asset_id (symbol, name, logo_url, network, withdraw_fee, asset_type)
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

      // Transform data to match expected format with USD values
      // Filter out fiat assets - only show crypto
      return (data || [])
        .filter((balance: any) => {
          const network = balance.assets?.network?.toLowerCase();
          const assetType = balance.assets?.asset_type?.toLowerCase();
          return network !== 'fiat' && assetType !== 'fiat' && assetType !== 'bonus';
        })
        .map((balance: any) => {
          const totalBalance = parseFloat(balance.total);
          const priceUsd = prices[balance.assets.symbol] || 0;
          
          return {
            symbol: balance.assets.symbol,
            name: balance.assets.name,
            balance: totalBalance,
            available: parseFloat(balance.available),
            locked: parseFloat(balance.locked),
            logo_url: balance.assets.logo_url,
            network: balance.assets?.network,
            withdraw_fee: balance.assets?.withdraw_fee,
            price_usd: priceUsd,
            usd_value: totalBalance * priceUsd,
          };
        });
    },
  });
};
