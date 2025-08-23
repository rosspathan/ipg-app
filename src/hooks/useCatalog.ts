import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  network: string;
  contract_address: string | null;
  decimals: number;
  logo_url: string | null;
  logo_file_path: string | null;
  logo_file_name: string | null;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
  trading_enabled: boolean;
  min_trade_amount: number;
  min_withdraw_amount: number;
  max_withdraw_amount: number;
  withdraw_fee: number;
  risk_label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Market {
  id: string;
  base_asset_id: string;
  quote_asset_id: string;
  tick_size: number;
  lot_size: number;
  min_notional: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  base_asset?: Asset;
  quote_asset?: Asset;
}

interface CatalogData {
  assetsById: Record<string, Asset>;
  assetsList: Asset[];
  marketsList: Market[];
  pairsBySymbol: Record<string, Market>;
  loading: boolean;
  error: string | null;
}

export const useCatalog = (): CatalogData => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

  // Helper function to get logo URL
  const getAssetLogoUrl = (asset: Asset): string => {
    if (asset.logo_file_path) {
      return `https://ocblgldglqhlrmtnynmu.supabase.co/storage/v1/object/public/crypto-logos/${asset.logo_file_path}`;
    }
    return asset.logo_url || '/placeholder-crypto.svg';
  };

  // Enhanced asset with computed logo URL
  const enhanceAsset = (asset: Asset): Asset => ({
    ...asset,
    logo_url: getAssetLogoUrl(asset),
  });

  // Load initial data
  const loadCatalogData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('is_active', true)
        .order('symbol');

      if (assetsError) throw assetsError;

      // Load markets with related assets
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select(`
          *,
          base_asset:assets!markets_base_asset_id_fkey(*),
          quote_asset:assets!markets_quote_asset_id_fkey(*)
        `)
        .eq('is_active', true)
        .order('created_at');

      if (marketsError) throw marketsError;

      // Process and enhance data
      const enhancedAssets = (assetsData || []).map(enhanceAsset);
      const enhancedMarkets = (marketsData || []).map(market => ({
        ...market,
        base_asset: market.base_asset ? enhanceAsset(market.base_asset) : undefined,
        quote_asset: market.quote_asset ? enhanceAsset(market.quote_asset) : undefined,
      }));

      setAssets(enhancedAssets);
      setMarkets(enhancedMarkets);
    } catch (err: any) {
      console.error('Error loading catalog data:', err);
      setError(err.message);
      toast({
        title: 'Error Loading Data',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Set up realtime subscriptions
  useEffect(() => {
    loadCatalogData();

    // Create realtime channel
    const channel = supabase
      .channel('catalog-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assets',
        },
        (payload) => {
          console.log('Assets table change detected:', payload);
          loadCatalogData(); // Reload data on any change
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'markets',
        },
        (payload) => {
          console.log('Markets table change detected:', payload);
          loadCatalogData(); // Reload data on any change
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  // Computed derived data
  const assetsById = assets.reduce((acc, asset) => {
    acc[asset.id] = asset;
    return acc;
  }, {} as Record<string, Asset>);

  const pairsBySymbol = markets.reduce((acc, market) => {
    if (market.base_asset && market.quote_asset) {
      const symbol = `${market.base_asset.symbol}/${market.quote_asset.symbol}`;
      acc[symbol] = market;
    }
    return acc;
  }, {} as Record<string, Market>);

  return {
    assetsById,
    assetsList: assets,
    marketsList: markets,
    pairsBySymbol,
    loading,
    error,
  };
};