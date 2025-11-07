import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useWeb3 } from '@/contexts/Web3Context';

export interface AdMiningSettings {
  id: string;
  free_daily_enabled: boolean;
  free_daily_reward_bsk: number;
  allow_multiple_subscriptions: boolean;
  missed_day_policy: 'forfeit' | 'carry_forward';
  carry_forward_days: number;
  auto_credit_no_inventory: boolean;
  daily_reset_timezone: string;
  max_free_per_day: number;
  max_subscription_payout_per_day_per_tier: number;
}

export interface SubscriptionTier {
  id: string;
  tier_bsk: number;
  duration_days: number;
  daily_bsk: number;
  is_active: boolean;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  tier_id: string;
  tier_bsk: number;
  purchased_bsk: number;
  daily_bsk: number;
  start_date: string;
  end_date: string;
  days_total: number;
  policy: 'forfeit' | 'carry_forward';
  total_earned_bsk: number;
  total_missed_days: number;
  status: 'active' | 'expired' | 'cancelled';
  tier?: SubscriptionTier;
}

export interface BSKBalances {
  withdrawable_balance: number;
  holding_balance: number;
  lifetime_withdrawable_earned: number;
  lifetime_holding_earned: number;
}

export interface DailyAdViews {
  date_key: string;
  free_views_used: number;
  subscription_views_used: number;
  total_bsk_earned: number;
  last_view_at: string;
}

export const useAdMining = () => {
  const { user } = useAuthUser();
  const { wallet } = useWeb3();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AdMiningSettings | null>(null);
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<UserSubscription[]>([]);
  const [bskBalances, setBskBalances] = useState<BSKBalances | null>(null);
  const [dailyViews, setDailyViews] = useState<DailyAdViews | null>(null);
  const [bskRate, setBskRate] = useState<number>(1.0);

  useEffect(() => {
    loadData();
  }, [user, wallet?.address]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSettings(),
        loadTiers(),
        loadBSKRate(),
        user ? loadUserData() : wallet?.address ? loadBSKByWallet(wallet.address) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error loading ad mining data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load advertising data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fallback: Load BSK balance by wallet when no session
  const loadBSKByWallet = async (walletAddress: string) => {
    try {
      console.log('[useAdMining] Loading BSK via wallet fallback:', walletAddress);
      const { data, error } = await supabase.functions.invoke('bsk-balance-by-wallet', {
        body: { wallet: walletAddress }
      });

      if (error) {
        console.error('[useAdMining] Edge Function error:', error);
        return;
      }

      if (data?.linked) {
        console.log('[useAdMining] ✓ BSK loaded via wallet:', data);
        setBskBalances({
          withdrawable_balance: data.withdrawable_balance,
          holding_balance: data.holding_balance,
          lifetime_withdrawable_earned: data.lifetime_withdrawable_earned,
          lifetime_holding_earned: data.lifetime_holding_earned
        });
      } else {
        console.log('[useAdMining] Wallet not linked to user account');
      }
    } catch (err) {
      console.error('[useAdMining] Failed to load BSK by wallet:', err);
    }
  };

  // Poll BSK balance when using wallet fallback
  useEffect(() => {
    if (!user?.id && wallet?.address) {
      // Start polling every 30 seconds
      const interval = setInterval(() => {
        loadBSKByWallet(wallet.address);
      }, 30000);

      // Initial load
      loadBSKByWallet(wallet.address);

      return () => clearInterval(interval);
    }
  }, [user?.id, wallet?.address]);

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('ad_mining_settings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    setSettings(data);
  };

  const loadTiers = async () => {
    const { data, error } = await supabase
      .from('ad_subscription_tiers')
      .select('*')
      .eq('is_active', true)
      .order('tier_bsk', { ascending: true });

    if (error) throw error;
    setTiers(data || []);
  };

  const loadUserData = async () => {
    // If no user session but wallet is connected, use wallet fallback
    if (!user?.id) {
      if (wallet?.address) {
        await loadBSKByWallet(wallet.address);
      }
      return;
    }

    // Load user subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('ad_user_subscriptions')
      .select(`
        *,
        tier:ad_subscription_tiers(*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (subError) throw subError;
    
    // Map subscriptions to ensure tier_bsk is included at the top level
    const mappedSubscriptions = (subscriptions || []).map((sub: any) => ({
      id: sub.id,
      user_id: sub.user_id,
      tier_id: sub.tier_id,
      tier_bsk: sub.purchased_bsk || (sub.tier as any)?.tier_bsk || 0,
      purchased_bsk: sub.purchased_bsk || 0,
      daily_bsk: sub.daily_bsk || 0,
      start_date: sub.start_date,
      end_date: sub.end_date,
      days_total: sub.days_total || 0,
      policy: sub.policy || 'carry_forward',
      total_earned_bsk: sub.total_earned_bsk || 0,
      total_missed_days: sub.total_missed_days || 0,
      status: sub.status,
      tier: sub.tier
    })) as UserSubscription[];
    
    setUserSubscriptions(mappedSubscriptions);

    // Load BSK balances (with robust fallback via edge function)
    const { data: balances, error: balError } = await supabase
      .from('user_bsk_balance_summary')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (balError && balError.code !== 'PGRST116') {
      throw balError;
    }

    let resolvedBalances = balances || null;

    // Fallback: if no summary row or all zeros, fetch via edge function using identifier
    const isAllZero = !resolvedBalances || (
      Number(resolvedBalances.withdrawable_balance || 0) === 0 &&
      Number(resolvedBalances.holding_balance || 0) === 0 &&
      Number(resolvedBalances.lifetime_withdrawable_earned || 0) === 0 &&
      Number(resolvedBalances.lifetime_holding_earned || 0) === 0
    );

    if (isAllZero) {
      try {
        const identifierBody: any = {};
        if (user.email) identifierBody.email = user.email;
        // Prefer email; username fallback requires extra query, so keep it simple
        const { data: byIdentifier, error: idErr } = await supabase.functions.invoke('bsk-balance-by-identifier', {
          body: identifierBody
        });

        if (!idErr && byIdentifier?.linked) {
          resolvedBalances = {
            user_id: user.id,
            withdrawable_balance: Number(byIdentifier.withdrawable_balance || 0),
            holding_balance: Number(byIdentifier.holding_balance || 0),
            lifetime_withdrawable_earned: Number(byIdentifier.lifetime_withdrawable_earned || 0),
            lifetime_holding_earned: Number(byIdentifier.lifetime_holding_earned || 0)
          } as any;
        }
      } catch (e) {
        console.warn('[useAdMining] Fallback via bsk-balance-by-identifier failed:', e);
      }
    }

    if (!balances && resolvedBalances) {
      // Persist a summary row so subsequent loads are fast
      try {
        await supabase.from('user_bsk_balance_summary').insert({
          user_id: user.id,
          withdrawable_balance: resolvedBalances.withdrawable_balance,
          holding_balance: resolvedBalances.holding_balance,
          lifetime_withdrawable_earned: resolvedBalances.lifetime_withdrawable_earned,
          lifetime_holding_earned: resolvedBalances.lifetime_holding_earned
        });
      } catch (e) {
        // ignore uniqueness race
      }
    }

    setBskBalances(
      resolvedBalances || balances || { 
        withdrawable_balance: 0, 
        holding_balance: 0, 
        lifetime_withdrawable_earned: 0, 
        lifetime_holding_earned: 0 
      }
    );

    // Load today's views
    const today = new Date().toISOString().split('T')[0];
    const { data: views, error: viewsError } = await supabase
      .from('user_daily_ad_views')
      .select('*')
      .eq('user_id', user.id)
      .eq('date_key', today)
      .maybeSingle();

    if (viewsError && viewsError.code !== 'PGRST116') {
      throw viewsError;
    }

    if (!views) {
      const { data: newViews, error: insertError } = await supabase
        .from('user_daily_ad_views')
        .insert({
          user_id: user.id,
          date_key: today
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setDailyViews(newViews);
    } else {
      setDailyViews(views);
    }
  };

  const purchaseSubscription = async (tierId: string, tierBSK: number) => {
    if (!user?.id || !settings) {
      throw new Error('User not authenticated or settings not loaded');
    }

    const tier = tiers.find(t => t.id === tierId);
    if (!tier) {
      throw new Error('Subscription tier not found');
    }

    const requiredBSK = tierBSK;

    // Check if user has enough BSK in their withdrawable balance
    if (!bskBalances || bskBalances.withdrawable_balance < requiredBSK) {
      throw new Error(`Insufficient BSK balance. Need ${requiredBSK} BSK`);
    }

    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + tier.duration_days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    // Create subscription
    const { data, error } = await supabase
      .from('ad_user_subscriptions')
      .insert([{
        user_id: user.id,
        tier_id: tierId,
        tier_inr: tierBSK,  // Legacy field, same as BSK for now
        purchased_bsk: requiredBSK,
        daily_bsk: tier.daily_bsk,
        start_date: startDate,
        end_date: endDate,
        days_total: tier.duration_days,
        policy: settings.missed_day_policy
      }])
      .select()
      .single();

    if (error) throw error;

    // Deduct BSK from withdrawable balance
    const { error: balanceError } = await supabase
      .from('user_bsk_balance_summary')
      .update({
        withdrawable_balance: bskBalances.withdrawable_balance - requiredBSK
      })
      .eq('user_id', user.id);

    if (balanceError) throw balanceError;

    // Create ledger entry for the purchase
    const currentWithdrawable = bskBalances?.withdrawable_balance || 0;
    await (supabase as any)
      .from('bsk_withdrawable_ledger')
      .insert({
        user_id: user.id,
        amount_bsk: -requiredBSK,
        tx_type: 'ad_subscription_purchase',
        tx_subtype: `${tierBSK}`,
        reference_id: data.id,
        balance_before: currentWithdrawable,
        balance_after: currentWithdrawable - requiredBSK,
        notes: `Purchased ${tierBSK} BSK subscription tier`
      });

    toast({
      title: 'Subscription Purchased!',
      description: `You've successfully purchased the ${tierBSK} BSK subscription tier for ${tier.duration_days} days.`
    });

    // Reload data
    await loadUserData();
  };

  const loadBSKRate = async () => {
    try {
      const { data, error } = await supabase
        .from('bsk_rates')
        .select('rate_inr_per_bsk')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        console.error('[useAdMining] Failed to fetch BSK rate:', error);
        setBskRate(1.0); // Fallback to 1 BSK = 1 INR
        return;
      }

      setBskRate(data.rate_inr_per_bsk);
    } catch (error) {
      console.error('[useAdMining] Error loading BSK rate:', error);
      setBskRate(1.0);
    }
  };

  const getCurrentBSKRate = () => {
    return bskRate; // Return cached rate
  };

  const canClaimFreeDaily = () => {
    if (!settings?.free_daily_enabled || !dailyViews) return false;
    return dailyViews.free_views_used < settings.max_free_per_day;
  };

  const getActiveSubscriptionDailyReward = () => {
    if (!settings?.allow_multiple_subscriptions) {
      // Single subscription mode - return highest tier
      const highestTier = userSubscriptions.reduce((max, sub) => 
        sub.daily_bsk > max ? sub.daily_bsk : max, 0
      );
      return highestTier;
    } else {
      // Multiple subscriptions allowed - sum all active
      return userSubscriptions.reduce((sum, sub) => sum + sub.daily_bsk, 0);
    }
  };

  return {
    loading,
    settings,
    tiers,
    userSubscriptions,
    bskBalances,
    dailyViews,
    bskRate,
    loadData,
    purchaseSubscription,
    getCurrentBSKRate,
    canClaimFreeDaily,
    getActiveSubscriptionDailyReward
  };
};
