import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { fetchWithTimeout, getErrorMessage } from '@/utils/fetchWithTimeout';

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

type CatalogStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

interface CatalogData {
  status: CatalogStatus;
  assets: Asset[];
  markets: Market[];
  assetsById: Record<string, Asset>;
  pairsBySymbol: Record<string, Market>;
  error: string | null;
  refetch: () => void;
  // Legacy compatibility
  assetsList: Asset[];
  marketsList: Market[];
  loading: boolean;
}

export const useCatalog = (): CatalogData => {
  const [status, setStatus] = useState<CatalogStatus>('idle');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const initialFetchDone = useRef(false);

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

  // Fetch assets with timeout and abort support
  const fetchAssets = async (): Promise<Asset[]> => {
    console.log('Starting assets fetch...');

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      try {
        controller.abort();
      } catch (e) {
        console.warn('Abort controller not supported in this environment');
      }
    }, 10000);

    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('is_active', true)
        .order('symbol')
        .limit(500)
        .abortSignal(controller.signal);

      if (error) {
        console.error('Assets fetch error:', error);
        throw error;
      }

      console.log(`Assets fetch successful: ${data?.length || 0} records`);
      return (data || []).map(enhanceAsset);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error('Timed out fetching assets');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  };

  // Fetch markets (non-blocking for wallet home)
  const fetchMarkets = async (): Promise<Market[]> => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select(`
          *,
          base_asset:assets!markets_base_asset_id_fkey(*),
          quote_asset:assets!markets_quote_asset_id_fkey(*)
        `)
        .eq('is_active', true)
        .order('created_at');

      if (error) {
        console.error('Markets fetch error:', error);
        // Don't throw - markets are non-blocking
        toast({
          title: 'Markets Loading Issue',
          description: 'Markets data unavailable, but assets are ready',
          variant: 'default',
        });
        return [];
      }

      return (data || []).map(market => ({
        ...market,
        base_asset: market.base_asset ? enhanceAsset(market.base_asset) : undefined,
        quote_asset: market.quote_asset ? enhanceAsset(market.quote_asset) : undefined,
      }));
    } catch (err) {
      console.error('Markets fetch failed:', err);
      return [];
    }
  };

  // Main data loading function
  const loadCatalogData = useCallback(async () => {
    try {
      setStatus('loading');
      setError(null);
      
      console.log('Loading catalog data...');

      // Fetch assets first - this is critical and blocking
      const assetsData = await fetchWithTimeout(fetchAssets, { ms: 10000 });
      
      // Check for empty state
      if (!assetsData || assetsData.length === 0) {
        console.log('No active assets found');
        setAssets([]);
        setMarkets([]);
        setStatus('empty');
        return;
      }

      console.log(`Loaded ${assetsData.length} assets`);
      setAssets(assetsData);
      setStatus('ready');

      // Fetch markets in parallel - non-blocking
      fetchMarkets().then(marketsData => {
        console.log(`Loaded ${marketsData.length} markets`);
        setMarkets(marketsData);
      });

      initialFetchDone.current = true;
      
    } catch (err: any) {
      console.error('Error loading catalog data:', err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      setStatus('error');
      
      // Don't show toast on initial permission errors - UI will handle it
      if (!errorMessage.includes('Permission denied')) {
        toast({
          title: 'Error Loading Assets',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  // Set up realtime subscriptions (only after initial success)
  useEffect(() => {
    loadCatalogData();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [loadCatalogData]);

  // Setup realtime after initial fetch succeeds
  useEffect(() => {
    if (!initialFetchDone.current) return;

    console.log('Setting up realtime subscriptions...');
    
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
          // Small delay to ensure DB consistency
          setTimeout(() => loadCatalogData(), 500);
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
          setTimeout(() => loadCatalogData(), 500);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [loadCatalogData]);

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
    status,
    assets,
    markets,
    assetsById,
    pairsBySymbol,
    error,
    refetch: loadCatalogData,
    // Legacy compatibility
    assetsList: assets,
    marketsList: markets,
    loading: status === 'loading',
  };
};