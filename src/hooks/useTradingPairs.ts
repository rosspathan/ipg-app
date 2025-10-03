import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TradingPair {
  id: string;
  symbol: string;
  base_symbol: string;
  quote_symbol: string;
  last_price: number;
  price_change_24h: number;
  volume_24h: number;
  visibility: 'listed' | 'unlisted' | 'paused';
  maker_fee: number;
  taker_fee: number;
  tick_size: number;
  lot_size: number;
  min_price: number;
  max_price: number;
  base_asset_id: string;
  quote_asset_id: string;
}

export function useTradingPairs(visibility?: 'listed' | 'unlisted' | 'paused') {
  return useQuery({
    queryKey: ['trading-pairs', visibility],
    queryFn: async () => {
      let query = supabase
        .from('trading_pairs' as any)
        .select(`
          *,
          base:assets!trading_pairs_base_asset_id_fkey(id, symbol, name, logo_url),
          quote:assets!trading_pairs_quote_asset_id_fkey(id, symbol, name)
        `)
        .eq('active', true)
        .order('volume_24h', { ascending: false });

      if (visibility) {
        query = query.eq('visibility', visibility);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((pair: any) => ({
        id: pair.id,
        symbol: pair.symbol,
        base_symbol: pair.base?.symbol || '',
        quote_symbol: pair.quote?.symbol || '',
        last_price: pair.last_price || 0,
        price_change_24h: pair.price_change_24h || 0,
        volume_24h: pair.volume_24h || 0,
        visibility: pair.visibility,
        maker_fee: pair.maker_fee,
        taker_fee: pair.taker_fee,
        tick_size: pair.tick_size,
        lot_size: pair.lot_size,
        min_price: pair.min_price,
        max_price: pair.max_price,
        base_asset_id: pair.base_asset_id,
        quote_asset_id: pair.quote_asset_id,
      })) as TradingPair[];
    },
  });
}

export function useTradingAssets(activeOnly: boolean = true) {
  return useQuery({
    queryKey: ['trading-assets', activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('assets')
        .select('*')
        .order('symbol');

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useTradingExecutionSettings() {
  return useQuery({
    queryKey: ['trading-execution-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_execution_settings' as any)
        .select('*')
        .eq('region', 'GLOBAL')
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
  });
}

export function useTradingUIDefaults() {
  return useQuery({
    queryKey: ['trading-ui-defaults'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_ui_defaults' as any)
        .select('*')
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
  });
}
