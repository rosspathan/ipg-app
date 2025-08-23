import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

type CatalogStatus = 'loading' | 'ready' | 'empty' | 'error';

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
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [error, setError] = useState<string | null>(null);

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

  // Simple data loading function
  const loadData = async () => {
    try {
      console.log('🔄 Loading assets...');
      setStatus('loading');
      setError(null);

      let didResolve = false;
      const timer = setTimeout(() => {
        if (!didResolve) {
          console.warn('⏳ Assets fetch timed out');
          setError('Timed out fetching assets');
          setStatus('error');
        }
      }, 10000);

      // Fetch assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .eq('is_active', true)
        .order('symbol');

      didResolve = true;
      clearTimeout(timer);

      if (assetsError) {
        console.error('❌ Assets error:', assetsError);
        setError(assetsError.message);
        setStatus('error');
        return;
      }

      if (!assetsData || assetsData.length === 0) {
        console.log('📭 No assets found');
        setStatus('empty');
        setAssets([]);
        setMarkets([]);
        return;
      }

      const enhancedAssets = assetsData.map(enhanceAsset);
      console.log('✅ Assets loaded:', enhancedAssets.length);
      setAssets(enhancedAssets);
      setStatus('ready');

      // Kick off markets fetch in background (non-blocking)
      (async () => {
        try {
          const { data, error } = await supabase
            .from('markets')
            .select('*')
            .eq('is_active', true)
            .order('created_at');

          if (error) {
            console.warn('⚠️ Markets load skipped:', error.message);
            return;
          }
          const enhancedMarkets = (data || []) as unknown as Market[];
          console.log('✅ Markets loaded:', enhancedMarkets.length);
          setMarkets(enhancedMarkets);
        } catch (e: any) {
          console.warn('⚠️ Markets load failed:', e?.message || e);
        }
      })();
    } catch (err: any) {
      console.error('❌ Load error:', err);
      setError(err.message || 'Failed to load data');
      setStatus('error');
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Set up realtime updates
  useEffect(() => {
    if (status !== 'ready') return;

    console.log('🔄 Setting up realtime...');
    
    const channel = supabase
      .channel('catalog-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => {
        console.log('🔄 Assets updated, reloading...');
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, () => {
        console.log('🔄 Markets updated, reloading...');
        setTimeout(loadData, 100);
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up realtime...');
      supabase.removeChannel(channel);
    };
  }, [status]);

  // Computed data
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
    refetch: loadData,
    // Legacy compatibility
    assetsList: assets,
    marketsList: markets,
    loading: status === 'loading',
  };
};