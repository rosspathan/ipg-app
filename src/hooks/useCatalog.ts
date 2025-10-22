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

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  perks: Record<string, any>;
  is_active: boolean;
  created_at: string;
}

interface ReferralConfig {
  id: string;
  levels: number;
  l1_percent: number;
  l2_percent: number;
  l3_percent: number;
  l4_percent: number;
  l5_percent: number;
  cap_usd: number;
  vip_multiplier: number;
  updated_at: string;
}

interface StakingPool {
  id: string;
  asset_id: string;
  name: string;
  staking_type: string;
  apy: number;
  lock_period_days: number;
  has_lock_period: boolean;
  min_stake_amount: number;
  max_stake_amount: number | null;
  capacity: number | null;
  current_staked: number;
  early_exit_penalty: number;
  platform_fee: number;
  reward_distribution: string;
  compound_rewards: boolean;
  active: boolean;
  description: string | null;
  terms_conditions: string | null;
  created_at: string;
  updated_at: string;
}

interface LuckyDrawPlan {
  id: string;
  name: string;
  ticket_price: number;
  prize_pool: number;
  winners: number;
  schedule: string;
  is_active: boolean;
  created_at: string;
}

interface InsurancePlan {
  id: string;
  plan_name: string;
  premium_amount: number;
  coverage_ratio: number;
  max_coverage_per_claim: number;
  min_loss_threshold: number;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface InsuranceSubscriptionTier {
  id: string;
  tier_name: string;
  monthly_fee: number;
  coverage_ratio: number;
  max_claim_per_trade: number;
  max_claims_per_month?: number;
  min_loss_threshold: number;
  bonus_rewards: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Ad {
  id: string;
  placement: string;
  title: string;
  image_url: string;
  link_url: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
}

interface FeesConfig {
  id: string;
  trading_maker: number;
  trading_taker: number;
  deposit_percent: number;
  withdraw_percent: number;
  transfer_percent: number;
  staking_fee: number;
  admin_revenue_wallet: string;
  updated_at: string;
}

type CatalogStatus = 'loading' | 'ready' | 'empty' | 'error';

interface MarketPair {
  id: string;
  pair: string;
  base_symbol: string;
  quote_symbol: string;
  base_logo: string;
  quote_logo: string;
  base_decimals: number;
  quote_decimals: number;
  tick_size: number;
  lot_size: number;
  min_notional: number;
  is_active: boolean;
  tradingview_symbol?: string;
}

interface CatalogData {
  status: CatalogStatus;
  assets: Asset[];
  markets: Market[];
  subscriptionPlans: SubscriptionPlan[];
  referralConfig: ReferralConfig | null;
  stakingPools: StakingPool[];
  luckyDrawPlans: LuckyDrawPlan[];
  insurancePlans: InsurancePlan[];
  insuranceTiers: InsuranceSubscriptionTier[];
  ads: Ad[];
  feesConfig: FeesConfig | null;
  assetsById: Record<string, Asset>;
  pairsBySymbol: Record<string, MarketPair>;
  pairsList: MarketPair[];
  error: string | null;
  refetch: () => void;
  lastUpdated: Record<string, string>;
  lastRealtimeEvent: string | null;
  // Legacy compatibility
  assetsList: Asset[];
  marketsList: Market[];
  loading: boolean;
}

export const useCatalog = (): CatalogData => {
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [referralConfig, setReferralConfig] = useState<ReferralConfig | null>(null);
  const [stakingPools, setStakingPools] = useState<StakingPool[]>([]);
  const [luckyDrawPlans, setLuckyDrawPlans] = useState<LuckyDrawPlan[]>([]);
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [insuranceTiers, setInsuranceTiers] = useState<InsuranceSubscriptionTier[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [feesConfig, setFeesConfig] = useState<FeesConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Record<string, string>>({});
  const [lastRealtimeEvent, setLastRealtimeEvent] = useState<string | null>(null);

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

  // Comprehensive data loading function
  const loadData = async () => {
    try {
      console.log('🔄 Loading catalog data...');
      setStatus('loading');
      setError(null);

      let didResolve = false;
      const timer = setTimeout(() => {
        if (!didResolve) {
          console.warn('⏳ Catalog fetch timed out');
          setError('Timed out fetching catalog data');
          setStatus('error');
        }
      }, 15000);

      // Fetch all catalog data in parallel
      const [
        assetsResult,
        marketsResult,
        subscriptionPlansResult,
        referralConfigResult,
        stakingPoolsResult,
        luckyDrawPlansResult,
        insurancePlansResult,
        insuranceTiersResult,
        adsResult,
        feesConfigResult
      ] = await Promise.allSettled([
        supabase.from('assets').select('*').eq('is_active', true).order('symbol'),
        supabase.from('markets').select(`
          *,
          base_asset:assets!base_asset_id(id, symbol, logo_url, logo_file_path, decimals, is_active),
          quote_asset:assets!quote_asset_id(id, symbol, logo_url, logo_file_path, decimals, is_active)
        `).eq('is_active', true).eq('base_asset.is_active', true).eq('quote_asset.is_active', true),
        (supabase as any).from('subscription_plans').select('*').eq('is_active', true).order('created_at'),
        (supabase as any).from('referral_configs').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('staking_pools').select('*').eq('active', true).order('created_at'),
        (supabase as any).from('draw_configs').select('*').eq('is_active', true).order('created_at'),
        supabase.from('insurance_plans').select('*').eq('is_active', true).order('created_at'),
        supabase.from('insurance_subscription_tiers').select('*').eq('is_active', true).order('monthly_fee'),
        (supabase as any).from('ads').select('*').eq('status', 'active').order('created_at'),
        (supabase as any).from('fee_configs').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle()
      ]);

      didResolve = true;
      clearTimeout(timer);

      // Process assets (required)
      if (assetsResult.status === 'fulfilled' && !assetsResult.value.error) {
        const assetsData = assetsResult.value.data || [];
        if (assetsData.length === 0) {
          console.log('📭 No assets found');
          setStatus('empty');
          return;
        }
        const enhancedAssets = assetsData.map(enhanceAsset);
        setAssets(enhancedAssets);
        console.log('✅ Assets loaded:', enhancedAssets.length);
      } else {
        console.error('❌ Assets error:', assetsResult.status === 'fulfilled' ? assetsResult.value.error : assetsResult.reason);
        setError('Failed to load assets');
        setStatus('error');
        return;
      }

      // Process markets
      if (marketsResult.status === 'fulfilled' && !marketsResult.value.error) {
        const marketsData = (marketsResult.value.data || []).map((market: any) => ({
          ...market,
          base_asset: market.base_asset?.[0] || market.base_asset,
          quote_asset: market.quote_asset?.[0] || market.quote_asset,
        }));
        setMarkets(marketsData);
        console.log('✅ Markets loaded:', marketsData.length);
      }

      // Process subscription plans
      if (subscriptionPlansResult.status === 'fulfilled' && !subscriptionPlansResult.value.error) {
        setSubscriptionPlans((subscriptionPlansResult.value.data || []) as SubscriptionPlan[]);
        console.log('✅ Subscription plans loaded:', subscriptionPlansResult.value.data?.length || 0);
      }

      // Process referral config
      if (referralConfigResult.status === 'fulfilled' && !referralConfigResult.value.error) {
        setReferralConfig(referralConfigResult.value.data as ReferralConfig);
        console.log('✅ Referral config loaded');
      }

      // Process staking pools
      if (stakingPoolsResult.status === 'fulfilled' && !stakingPoolsResult.value.error) {
        setStakingPools((stakingPoolsResult.value.data || []) as StakingPool[]);
        console.log('✅ Staking pools loaded:', stakingPoolsResult.value.data?.length || 0);
      }

      // Process lucky draw plans
      if (luckyDrawPlansResult.status === 'fulfilled' && !luckyDrawPlansResult.value.error) {
        setLuckyDrawPlans((luckyDrawPlansResult.value.data || []) as LuckyDrawPlan[]);
        console.log('✅ Lucky draw plans loaded:', luckyDrawPlansResult.value.data?.length || 0);
      }

      // Process insurance plans
      if (insurancePlansResult.status === 'fulfilled' && !insurancePlansResult.value.error) {
        setInsurancePlans((insurancePlansResult.value.data || []) as InsurancePlan[]);
        console.log('✅ Insurance plans loaded:', insurancePlansResult.value.data?.length || 0);
      }

      // Process insurance tiers
      if (insuranceTiersResult.status === 'fulfilled' && !insuranceTiersResult.value.error) {
        setInsuranceTiers((insuranceTiersResult.value.data || []) as InsuranceSubscriptionTier[]);
        console.log('✅ Insurance tiers loaded:', insuranceTiersResult.value.data?.length || 0);
      }
      if (adsResult.status === 'fulfilled' && !adsResult.value.error) {
        const now = new Date().toISOString();
        const activeAds = ((adsResult.value.data || []) as Ad[]).filter((ad: Ad) => 
          !ad.ends_at || ad.ends_at > now
        );
        setAds(activeAds);
        console.log('✅ Ads loaded:', activeAds.length);
      }

      // Process fees config
      if (feesConfigResult.status === 'fulfilled' && !feesConfigResult.value.error) {
        setFeesConfig(feesConfigResult.value.data as FeesConfig);
        console.log('✅ Fees config loaded');
      }

      setStatus('ready');
      setLastUpdated({
        assets: new Date().toISOString(),
        markets: new Date().toISOString(),
        subscriptionPlans: new Date().toISOString(),
        referralConfig: new Date().toISOString(),
        stakingPools: new Date().toISOString(),
        luckyDrawPlans: new Date().toISOString(),
        insurancePlans: new Date().toISOString(),
        insuranceTiers: new Date().toISOString(),
        ads: new Date().toISOString(),
        feesConfig: new Date().toISOString(),
      });

    } catch (err: any) {
      console.error('❌ Catalog load error:', err);
      setError(err.message || 'Failed to load catalog data');
      setStatus('error');
    }
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Set up realtime updates for all catalog tables
  useEffect(() => {
    if (status !== 'ready') return;

    console.log('🔄 Setting up comprehensive realtime...');
    
    const channel = supabase
      .channel('catalog-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, (payload) => {
        console.log('🔄 Assets updated:', payload.eventType);
        setLastRealtimeEvent(`${new Date().toISOString()}: Assets ${payload.eventType}`);
        setLastUpdated(prev => ({ ...prev, assets: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, (payload) => {
        console.log('🔄 Markets updated:', payload.eventType);
        setLastRealtimeEvent(`${new Date().toISOString()}: Markets ${payload.eventType}`);
        setLastUpdated(prev => ({ ...prev, markets: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscription_plans' }, (payload) => {
        console.log('🔄 Subscription plans updated:', payload.eventType);
        setLastUpdated(prev => ({ ...prev, subscriptionPlans: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_configs' }, (payload) => {
        console.log('🔄 Referrals config updated:', payload.eventType);
        setLastUpdated(prev => ({ ...prev, referralConfig: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staking_pools' }, (payload) => {
        console.log('🔄 Staking pools updated:', payload.eventType);
        setLastUpdated(prev => ({ ...prev, stakingPools: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draw_configs' }, (payload) => {
        console.log('🔄 Lucky draw plans updated:', payload.eventType);
        setLastUpdated(prev => ({ ...prev, luckyDrawPlans: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insurance_plans' }, (payload) => {
        console.log('🔄 Insurance plans updated:', payload.eventType);
        setLastUpdated(prev => ({ ...prev, insurancePlans: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ads' }, (payload) => {
        console.log('🔄 Ads updated:', payload.eventType);
        setLastUpdated(prev => ({ ...prev, ads: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fee_configs' }, (payload) => {
        console.log('🔄 Fees config updated:', payload.eventType);
        setLastUpdated(prev => ({ ...prev, feesConfig: new Date().toISOString() }));
        setTimeout(loadData, 100);
      })
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up comprehensive realtime...');
      supabase.removeChannel(channel);
    };
  }, [status]);

  // Computed data
  const assetsById = assets.reduce((acc, asset) => {
    acc[asset.id] = asset;
    return acc;
  }, {} as Record<string, Asset>);

  // Build trading pairs list with all required data
  const pairsList: MarketPair[] = markets
    .filter(market => market.base_asset && market.quote_asset)
    .map(market => {
      const baseAsset = market.base_asset!;
      const quoteAsset = market.quote_asset!;
      const pair = `${baseAsset.symbol}/${quoteAsset.symbol}`;
      
      return {
        id: market.id,
        pair,
        base_symbol: baseAsset.symbol,
        quote_symbol: quoteAsset.symbol,
        base_logo: getAssetLogoUrl(baseAsset),
        quote_logo: getAssetLogoUrl(quoteAsset),
        base_decimals: baseAsset.decimals,
        quote_decimals: quoteAsset.decimals,
        tick_size: market.tick_size,
        lot_size: market.lot_size,
        min_notional: market.min_notional,
        is_active: market.is_active,
        tradingview_symbol: `BINANCE:${baseAsset.symbol}${quoteAsset.symbol}`,
      };
    });

  const pairsBySymbol = pairsList.reduce((acc, pair) => {
    acc[pair.pair] = pair;
    return acc;
  }, {} as Record<string, MarketPair>);

  return {
    status,
    assets,
    markets,
    subscriptionPlans,
    referralConfig,
    stakingPools,
    luckyDrawPlans,
    insurancePlans,
    insuranceTiers,
    ads,
    feesConfig,
    assetsById,
    pairsBySymbol,
    pairsList,
    error,
    refetch: loadData,
    lastUpdated,
    lastRealtimeEvent,
    // Legacy compatibility
    assetsList: assets,
    marketsList: markets,
    loading: status === 'loading',
  };
};