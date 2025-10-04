import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TradingPair {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  base_symbol: string;
  baseAssetId: string;
  quoteAssetId: string;
  tickSize: number;
  lotSize: number;
  minNotional: number;
  price: number;
  last_price: number;
  change24h: number;
  price_change_24h: number;
  volume24h: number;
  volume_24h: number;
  high24h: number;
  low24h: number;
}

export function useTradingPairs(type?: 'listed' | 'all') {
  return useQuery({
    queryKey: ['trading-pairs'],
    queryFn: async () => {
      const { data: markets, error } = await supabase
        .from('markets')
        .select(`
          id,
          tick_size,
          lot_size,
          min_notional,
          base_asset:assets!markets_base_asset_id_fkey(id, symbol, name),
          quote_asset:assets!markets_quote_asset_id_fkey(id, symbol, name)
        `)
        .eq('is_active', true);

      if (error) throw error;

      // Transform to trading pairs with mock market data (replace with real data later)
      const pairs: TradingPair[] = (markets || []).map((market: any) => {
        const symbol = `${market.base_asset.symbol}/${market.quote_asset.symbol}`;
        
        // Generate realistic mock prices based on the pair
        let basePrice = 1;
        if (market.base_asset.symbol === 'BTC') basePrice = 43250;
        else if (market.base_asset.symbol === 'ETH') basePrice = 2245;
        else if (market.base_asset.symbol === 'BNB ORIGINAL') basePrice = 1147;
        else if (market.base_asset.symbol === 'BSK') basePrice = 1.5;
        else if (market.base_asset.symbol === 'IPG') basePrice = 0.5;
        else basePrice = Math.random() * 100;

        const change = (Math.random() - 0.5) * 10;
        const volume = Math.random() * 1000000000;

        return {
          id: market.id,
          symbol,
          baseAsset: market.base_asset.symbol,
          quoteAsset: market.quote_asset.symbol,
          base_symbol: market.base_asset.symbol,
          baseAssetId: market.base_asset.id,
          quoteAssetId: market.quote_asset.id,
          tickSize: market.tick_size,
          lotSize: market.lot_size,
          minNotional: market.min_notional,
          price: basePrice,
          last_price: basePrice,
          change24h: change,
          price_change_24h: change,
          volume24h: volume,
          volume_24h: volume,
          high24h: basePrice * (1 + Math.random() * 0.1),
          low24h: basePrice * (1 - Math.random() * 0.1),
        };
      });

      return pairs;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });
}

export function useTradingUIDefaults() {
  return useQuery({
    queryKey: ['trading-ui-defaults'],
    queryFn: async () => {
      return {
        defaultPair: 'BTC/USDT',
        defaultTimeframe: '1h',
      };
    },
  });
}

export function useMarketData(pairSymbol: string) {
  const { data: pairs } = useTradingPairs();
  
  return useQuery({
    queryKey: ['market-data', pairSymbol],
    queryFn: () => {
      const pair = pairs?.find(p => p.symbol === pairSymbol);
      if (!pair) throw new Error('Pair not found');
      return pair;
    },
    enabled: !!pairs && !!pairSymbol,
    refetchInterval: 5000,
  });
}
