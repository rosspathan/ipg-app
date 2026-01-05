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
      // First, try to update prices from CoinGecko (fire and forget)
      supabase.functions.invoke('fetch-crypto-prices').catch(err => {
        console.warn('Failed to update prices:', err);
      });

      // Fetch markets with their latest prices
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

      // Fetch latest prices from market_prices
      const { data: prices } = await supabase
        .from('market_prices')
        .select('*')
        .order('last_updated', { ascending: false });

      // Create a map of market_id to price data
      const priceMap = new Map();
      prices?.forEach(price => {
        if (!priceMap.has(price.market_id)) {
          priceMap.set(price.market_id, price);
        }
      });

      // Fetch last trade prices for each symbol (priority over market_prices)
      const { data: lastTrades } = await supabase
        .from('trades')
        .select('symbol, price, created_at')
        .order('created_at', { ascending: false });

      // Create a map of symbol to last trade price
      const lastTradeMap = new Map<string, number>();
      lastTrades?.forEach(trade => {
        if (!lastTradeMap.has(trade.symbol)) {
          lastTradeMap.set(trade.symbol, trade.price);
        }
      });

      // Transform to trading pairs with real market data
      const pairs: TradingPair[] = (markets || []).map((market: any) => {
        const symbol = `${market.base_asset.symbol}/${market.quote_asset.symbol}`;
        const priceData = priceMap.get(market.id);
        
        // Priority: 1) Last trade price, 2) market_prices, 3) fallback
        const lastTradePrice = lastTradeMap.get(symbol);
        const marketPrice = priceData?.current_price;
        const currentPrice = lastTradePrice || marketPrice || getFallbackPrice(market.base_asset.symbol);
        
        const priceChange24h = priceData?.price_change_percentage_24h || 0;
        const high24h = priceData?.high_24h || currentPrice * 1.05;
        const low24h = priceData?.low_24h || currentPrice * 0.95;
        const volume24h = priceData?.volume_24h || 1000000;

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
          price: currentPrice,
          last_price: currentPrice,
          change24h: priceChange24h,
          price_change_24h: priceChange24h,
          volume24h: volume24h,
          volume_24h: volume24h,
          high24h: high24h,
          low24h: low24h,
        };
      });

      return pairs;
    },
    refetchInterval: 60000, // Refresh every 60 seconds (reduced to avoid rate limits)
    staleTime: 30000,
  });
}

// Fallback prices for when API is not available
function getFallbackPrice(symbol: string): number {
  const fallbackPrices: Record<string, number> = {
    'BTC': 43250,
    'ETH': 2245,
    'BNB ORIGINAL': 315,
    'SOL': 95,
    'ADA': 0.55,
    'DOT': 7.2,
    'MATIC': 0.85,
    'AVAX': 35,
    'LINK': 14.5,
    'UNI': 6.8,
    'ATOM': 9.5,
    'XRP': 0.52,
    'DOGE': 0.08,
    'LTC': 72,
    'TRX': 0.1,
    'SHIB': 0.00001,
    'APT': 8.5,
    'ARB': 1.2,
    'OP': 2.3,
    'INJ': 25,
    'FIL': 5.5,
    'NEAR': 3.8,
    'VET': 0.03,
    'AAVE': 95,
    'GRT': 0.15,
    'ALGO': 0.18,
    'XLM': 0.12,
    'SAND': 0.45,
    'BSK': 1.5,
    'IPG': 0.5,
    'USDT': 1.0,
    'INR': 0.012,
  };
  return fallbackPrices[symbol] || 1;
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
