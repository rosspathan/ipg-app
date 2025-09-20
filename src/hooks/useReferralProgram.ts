import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BonusAsset {
  id: string;
  symbol: string;
  name: string;
  contract_address: string | null;
  network: string;
  decimals: number;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface BonusPrice {
  id: string;
  asset_id: string;
  price: number;
  base_symbol: string;
  recorded_at: string;
  recorded_by: string | null;
}

export interface ReferralSettings {
  id: string;
  enabled: boolean;
  default_asset_id: string | null;
  levels: any; // JSONB field
  qualifying_actions: any; // JSONB field
  caps: any; // JSONB field
  schedule: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralEvent {
  id: string;
  user_id: string;
  referrer_id: string;
  action: string;
  level: number;
  amount_bonus: number;
  bonus_asset_id: string | null;
  usd_value: number;
  tx_status: string;
  notes: string | null;
  created_at: string;
}

export interface WalletBonusBalance {
  id: string;
  user_id: string;
  asset_id: string;
  balance: number;
  updated_at: string;
}

export interface ReferralRelationship {
  id: string;
  referrer_id: string;
  referee_id: string;
  created_at: string;
}

export const useReferralProgram = () => {
  const [bonusAssets, setBonusAssets] = useState<BonusAsset[]>([]);
  const [bonusPrices, setBonusPrices] = useState<BonusPrice[]>([]);
  const [referralSettings, setReferralSettings] = useState<ReferralSettings | null>(null);
  const [referralEvents, setReferralEvents] = useState<ReferralEvent[]>([]);
  const [bonusBalances, setBonusBalances] = useState<WalletBonusBalance[]>([]);
  const [referralRelationships, setReferralRelationships] = useState<ReferralRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch bonus assets
  const fetchBonusAssets = async () => {
    try {
      console.log('🔄 Fetching bonus assets...');
      const { data, error } = await supabase
        .from('bonus_assets')
        .select('*')
        .order('symbol');
      
      if (error) throw error;
      setBonusAssets(data || []);
      console.log('✅ Bonus assets loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching bonus assets:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bonus assets",
        variant: "destructive",
      });
    }
  };

  // Fetch bonus prices
  const fetchBonusPrices = async () => {
    try {
      console.log('🔄 Fetching bonus prices...');
      const { data, error } = await supabase
        .from('bonus_prices')
        .select('*')
        .order('recorded_at', { ascending: false });
      
      if (error) throw error;
      setBonusPrices(data || []);
      console.log('✅ Bonus prices loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching bonus prices:', error);
    }
  };

  // Fetch referral settings
  const fetchReferralSettings = async () => {
    try {
      console.log('🔄 Fetching referral settings...');
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setReferralSettings(data);
      console.log('✅ Referral settings loaded:', data ? 'found' : 'not found');
    } catch (error) {
      console.error('❌ Error fetching referral settings:', error);
    }
  };

  // Fetch referral events
  const fetchReferralEvents = async () => {
    try {
      console.log('🔄 Fetching referral events...');
      const { data, error } = await supabase
        .from('referral_events')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReferralEvents(data || []);
      console.log('✅ Referral events loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching referral events:', error);
    }
  };

  // Fetch bonus balances
  const fetchBonusBalances = async () => {
    try {
      console.log('🔄 Fetching bonus balances...');
      const { data, error } = await supabase
        .from('wallet_bonus_balances')
        .select('*');
      
      if (error) throw error;
      setBonusBalances(data || []);
      console.log('✅ Bonus balances loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching bonus balances:', error);
    }
  };

  // Fetch referral relationships
  const fetchReferralRelationships = async () => {
    try {
      console.log('🔄 Fetching referral relationships...');
      const { data, error } = await supabase
        .from('referral_relationships')
        .select('*');
      
      if (error) throw error;
      setReferralRelationships(data || []);
      console.log('✅ Referral relationships loaded:', data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching referral relationships:', error);
    }
  };

  // Update referral settings
  const updateReferralSettings = async (settings: Partial<ReferralSettings>) => {
    try {
      if (referralSettings?.id) {
        const { data, error } = await supabase
          .from('referral_settings')
          .update(settings)
          .eq('id', referralSettings.id)
          .select()
          .single();
        
        if (error) throw error;
        setReferralSettings(data);
      } else {
        const { data, error } = await supabase
          .from('referral_settings')
          .insert(settings)
          .select()
          .single();
        
        if (error) throw error;
        setReferralSettings(data);
      }
      
      toast({
        title: "Success",
        description: "Referral settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating referral settings:', error);
      toast({
        title: "Error",
        description: "Failed to update referral settings",
        variant: "destructive",
      });
    }
  };

  // Update bonus asset price
  const updateBonusPrice = async (assetId: string, price: number, reason?: string) => {
    try {
      const { error } = await supabase
        .from('bonus_prices')
        .insert({
          asset_id: assetId,
          price: price,
          base_symbol: 'USDT'
        });
      
      if (error) throw error;
      
      // Log admin action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'bonus_price_update',
          resource_type: 'bonus_assets',
          resource_id: assetId,
          new_values: { price, reason }
        });
      
      await fetchBonusPrices();
      
      toast({
        title: "Success",
        description: "Bonus asset price updated successfully",
      });
    } catch (error) {
      console.error('Error updating bonus price:', error);
      toast({
        title: "Error",
        description: "Failed to update bonus asset price",
        variant: "destructive",
      });
    }
  };

  // Create bonus asset
  const createBonusAsset = async (asset: { name: string; symbol: string; [key: string]: any }) => {
    try {
      const { data, error } = await supabase
        .from('bonus_assets')
        .insert(asset)
        .select()
        .single();
      
      if (error) throw error;
      
      await fetchBonusAssets();
      
      toast({
        title: "Success",
        description: "Bonus asset created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating bonus asset:', error);
      toast({
        title: "Error",
        description: "Failed to create bonus asset",
        variant: "destructive",
      });
    }
  };

  // Adjust user bonus balance
  const adjustBonusBalance = async (userId: string, assetId: string, amount: number, reason: string) => {
    try {
      const { error } = await supabase
        .from('wallet_bonus_balances')
        .upsert({
          user_id: userId,
          asset_id: assetId,
          balance: amount
        }, {
          onConflict: 'user_id,asset_id'
        });
      
      if (error) throw error;
      
      // Log admin action
      await supabase
        .from('audit_logs')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          action: 'bonus_balance_adjustment',
          resource_type: 'wallet_bonus_balances',
          resource_id: `${userId}-${assetId}`,
          new_values: { amount, reason, target_user_id: userId }
        });
      
      await fetchBonusBalances();
      
      toast({
        title: "Success",
        description: "Bonus balance adjusted successfully",
      });
    } catch (error) {
      console.error('Error adjusting bonus balance:', error);
      toast({
        title: "Error",
        description: "Failed to adjust bonus balance",
        variant: "destructive",
      });
    }
  };

  // Get current price for a bonus asset
  const getCurrentPrice = (assetId: string): number => {
    const prices = bonusPrices.filter(p => p.asset_id === assetId);
    return prices.length > 0 ? prices[0].price : 0;
  };

  // Get BSK asset
  const getBSKAsset = (): BonusAsset | null => {
    return bonusAssets.find(asset => asset.symbol === 'BSK') || null;
  };

  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 Starting referral program data load...');
      setLoading(true);
      try {
        await Promise.all([
          fetchBonusAssets(),
          fetchBonusPrices(),
          fetchReferralSettings(),
          fetchReferralEvents(),
          fetchBonusBalances(),
          fetchReferralRelationships()
        ]);
        console.log('✅ All referral program data loaded successfully');
      } catch (error) {
        console.error('❌ Error loading referral program data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time subscriptions
    const bonusAssetsSubscription = supabase
      .channel('bonus_assets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bonus_assets' }, fetchBonusAssets)
      .subscribe();

    const bonusPricesSubscription = supabase
      .channel('bonus_prices_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bonus_prices' }, fetchBonusPrices)
      .subscribe();

    const referralSettingsSubscription = supabase
      .channel('referral_settings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_settings' }, fetchReferralSettings)
      .subscribe();

    const referralEventsSubscription = supabase
      .channel('referral_events_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_events' }, fetchReferralEvents)
      .subscribe();

    const bonusBalancesSubscription = supabase
      .channel('bonus_balances_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_bonus_balances' }, fetchBonusBalances)
      .subscribe();

    return () => {
      supabase.removeChannel(bonusAssetsSubscription);
      supabase.removeChannel(bonusPricesSubscription);
      supabase.removeChannel(referralSettingsSubscription);
      supabase.removeChannel(referralEventsSubscription);
      supabase.removeChannel(bonusBalancesSubscription);
    };
  }, []);

  return {
    bonusAssets,
    bonusPrices,
    referralSettings,
    referralEvents,
    bonusBalances,
    referralRelationships,
    loading,
    updateReferralSettings,
    updateBonusPrice,
    createBonusAsset,
    adjustBonusBalance,
    getCurrentPrice,
    getBSKAsset,
    refetch: async () => {
      await Promise.all([
        fetchBonusAssets(),
        fetchBonusPrices(),
        fetchReferralSettings(),
        fetchReferralEvents(),
        fetchBonusBalances(),
        fetchReferralRelationships()
      ]);
    }
  };
};