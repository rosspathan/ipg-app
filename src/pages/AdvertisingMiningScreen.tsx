/**
 * Advertising Mining Screen
 * 
 * Two earning methods:
 * 1. FREE DAILY ADS: Watch 1 ad/day → Earn 1 BSK to Holding Balance
 * 2. SUBSCRIPTION ADS: Purchase tiers (₹100-₹10,000 BSK) → Watch 1 ad/day per subscription
 *    - Daily reward: 1% of subscription value (withdrawable)
 *    - Duration: 100 days
 *    - Example: ₹1,000 subscription = 10 BSK/day × 100 days = 1,000 BSK total (withdrawable)
 * 
 * Multiple subscriptions stack (e.g., 3 subscriptions = 3 ads/day possible)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Coins, Eye, Timer, Play, CheckCircle, Clock, Zap, Gift, Crown, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useAdMining } from '@/hooks/useAdMining';
import { AdBanner } from '@/components/AdBanner';
import { BSKBalanceCard } from '@/components/BSKBalanceCard';
import { cn } from '@/lib/utils';

interface Ad {
  id: string;
  title: string;
  image_url: string;
  square_image_url?: string;
  target_url: string;
  reward_bsk: number;
  required_view_time: number;
  required_view_time_seconds: number;
  placement: string;
  max_impressions_per_user_per_day: number;
  status: string;
  verification_required: boolean;
}

const AdvertisingMiningScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const {
    loading,
    settings,
    tiers,
    userSubscriptions,
    bskBalances,
    dailyViews,
    loadData,
    purchaseSubscription,
    canClaimFreeDaily,
    getActiveSubscriptionDailyReward
  } = useAdMining();

  const [ads, setAds] = useState<Ad[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [viewProgress, setViewProgress] = useState(0);
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);

  useEffect(() => {
    loadAds();
  }, []);

  const loadAds = async () => {
    try {
      setAdsLoading(true);
      const { data: adsData, error } = await supabase
        .from('ads')
        .select('*')
        .eq('status', 'active')
        .gte('end_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(adsData || []);
    } catch (error) {
      console.error('Error loading ads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ads',
        variant: 'destructive'
      });
    } finally {
      setAdsLoading(false);
    }
  };

  const handlePurchaseSubscription = async (tierId: string, tierINR: number) => {
    try {
      setPurchasingTier(tierId);
      await purchaseSubscription(tierId, tierINR);
    } catch (error: any) {
      toast({
        title: 'Purchase Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setPurchasingTier(null);
    }
  };

  const handleFreeAdClick = async (adId: string) => {
    if (!user?.id || !settings) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to earn rewards',
        variant: 'destructive'
      });
      return;
    }

    if (!canClaimFreeDaily()) {
      toast({
        title: 'Daily Limit Reached',
        description: `You've used your ${settings.max_free_per_day} free view(s) for today`,
        variant: 'destructive'
      });
      return;
    }

    const ad = ads.find(a => a.id === adId);
    if (!ad) return;

    try {
      // Start ad viewing process
      setCurrentAd(ad);
      setIsViewing(true);
      setViewProgress(0);
      
      startAdViewing(ad, 'free');
    } catch (error) {
      console.error('Error starting ad view:', error);
      toast({
        title: 'Error',
        description: 'Failed to start ad viewing',
        variant: 'destructive'
      });
    }
  };

  const handleSubscriptionAdClick = async (adId: string) => {
    if (!user?.id || !settings) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to earn rewards',
        variant: 'destructive'
      });
      return;
    }

    if (userSubscriptions.length === 0) {
      toast({
        title: 'Subscription Required',
        description: 'Purchase a subscription to earn withdrawable BSK rewards',
        variant: 'destructive'
      });
      return;
    }

    // Check if user has already used their subscription ad views for today
    const maxAdsPerDay = userSubscriptions.length * (settings.max_subscription_payout_per_day_per_tier || 1);
    if ((dailyViews?.subscription_views_used || 0) >= maxAdsPerDay) {
      toast({
        title: 'Daily Limit Reached',
        description: `You've used all ${maxAdsPerDay} subscription ad(s) for today (1 per active subscription)`,
        variant: 'destructive'
      });
      return;
    }

    const ad = ads.find(a => a.id === adId);
    if (!ad) return;

    try {
      setCurrentAd(ad);
      setIsViewing(true);
      setViewProgress(0);
      
      startAdViewing(ad, 'subscription');
    } catch (error) {
      console.error('Error starting ad view:', error);
      toast({
        title: 'Error',
        description: 'Failed to start ad viewing',
        variant: 'destructive'
      });
    }
  };

  const startAdViewing = (ad: Ad, type: 'free' | 'subscription') => {
    const duration = (ad.required_view_time_seconds || ad.required_view_time || 30) * 1000;
    const interval = 100;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      setViewProgress(progress);

      if (progress >= 100) {
        clearInterval(timer);
        completeAdViewing(ad, type);
      }
    }, interval);
  };

  const completeAdViewing = async (ad: Ad, type: 'free' | 'subscription') => {
    if (!user?.id || !settings) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (type === 'free') {
        // Add to holding ledger
        const baseHolding = (bskBalances?.holding_balance || 0);
        const { error: ledgerError } = await (supabase as any)
          .from('bsk_holding_ledger')
          .insert({
            user_id: user.id,
            amount_bsk: settings.free_daily_reward_bsk,
            amount_inr: 0,
            rate_snapshot: 1,
            tx_type: 'ad_free_view',
            tx_subtype: ad.id,
            reference_id: ad.id,
            balance_before: baseHolding,
            balance_after: baseHolding + settings.free_daily_reward_bsk,
            notes: `Free daily ad view on ${today}`
          });

        if (ledgerError) throw ledgerError;

        // Update holding balance
        const { error: balanceError } = await supabase
          .from('user_bsk_balance_summary')
          .update({
            holding_balance: (bskBalances?.holding_balance || 0) + settings.free_daily_reward_bsk,
            lifetime_holding_earned: (bskBalances?.lifetime_holding_earned || 0) + settings.free_daily_reward_bsk
          })
          .eq('user_id', user.id);

        if (balanceError) throw balanceError;

        // Update daily views
        const { error: viewsError } = await supabase
          .from('user_daily_ad_views')
          .update({
            free_views_used: (dailyViews?.free_views_used || 0) + 1,
            total_bsk_earned: (dailyViews?.total_bsk_earned || 0) + settings.free_daily_reward_bsk,
            last_view_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('date_key', today);

        if (viewsError) throw viewsError;

        toast({
          title: '🎉 Free Reward Earned!',
          description: `You earned ${settings.free_daily_reward_bsk} BSK to your Holding Balance!`
        });
      } else {
        // Subscription reward
        const dailyReward = getActiveSubscriptionDailyReward();
        
        if (dailyReward > 0) {
          // Add to withdrawable ledger for each active subscription
          let runningBalance = bskBalances?.withdrawable_balance || 0;
          for (const subscription of userSubscriptions) {
            const amount = subscription.daily_bsk;
            const { error: ledgerError } = await (supabase as any)
              .from('bsk_withdrawable_ledger')
              .insert({
                user_id: user.id,
                amount_bsk: amount,
                amount_inr: 0,
                rate_snapshot: 1,
                tx_type: 'ad_subscription_daily',
                tx_subtype: subscription.id,
                reference_id: subscription.id,
                balance_before: runningBalance,
                balance_after: runningBalance + amount,
                notes: `Daily subscription reward for ${subscription.tier_bsk} BSK tier`
              });

            if (ledgerError) throw ledgerError;
            runningBalance += amount;
          }

          // Update withdrawable balance
          const { error: balanceError } = await supabase
            .from('user_bsk_balance_summary')
            .update({
              withdrawable_balance: (bskBalances?.withdrawable_balance || 0) + dailyReward,
              lifetime_withdrawable_earned: (bskBalances?.lifetime_withdrawable_earned || 0) + dailyReward
            })
            .eq('user_id', user.id);

          if (balanceError) throw balanceError;

          // Update daily views
          const { error: viewsError } = await supabase
            .from('user_daily_ad_views')
            .update({
              subscription_views_used: (dailyViews?.subscription_views_used || 0) + 1,
              total_bsk_earned: (dailyViews?.total_bsk_earned || 0) + dailyReward,
              last_view_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('date_key', today);

          if (viewsError) throw viewsError;

          toast({
            title: '🎉 Subscription Reward Earned!',
            description: `You earned ${dailyReward} BSK to your Withdrawable Balance!`
          });
        }
      }

      // Reset viewing state
      setIsViewing(false);
      setCurrentAd(null);
      setViewProgress(0);

      // Reload data
      await loadData();

      // Open target URL if provided
      if (ad.target_url) {
        window.open(ad.target_url, '_blank');
      }
    } catch (error) {
      console.error('Error completing ad view:', error);
      toast({
        title: 'Error',
        description: 'Failed to process reward',
        variant: 'destructive'
      });
    }
  };

  if (loading || adsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-black text-white">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1)_0%,transparent_50%)]" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-green-500" />
      
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4 pt-12">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/app/programs')}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Advertising Mining
          </h1>
          <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
            💰 Watch ads and earn BSK rewards
          </p>
        </div>
        <div className="w-10" />
      </div>

      {/* Ad Viewing Modal */}
      {isViewing && currentAd && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-slate-800/90 backdrop-blur border-slate-700">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Play className="w-8 h-8 text-green-400" />
              </div>
              <CardTitle className="text-white">{currentAd.title}</CardTitle>
              <p className="text-slate-400 text-sm">
                Watch for {currentAd.required_view_time_seconds || currentAd.required_view_time || 30} seconds to earn BSK
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-100 ease-linear"
                  style={{ width: `${viewProgress}%` }}
                />
              </div>
              <div className="text-center text-sm text-slate-400">
                {Math.ceil(((100 - viewProgress) / 100) * (currentAd.required_view_time_seconds || currentAd.required_view_time || 30))} seconds remaining
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-24">
        <Tabs defaultValue="free" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 backdrop-blur">
            <TabsTrigger value="free" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Free Daily
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
          </TabsList>

          {/* Free Daily Tab */}
          <TabsContent value="free" className="space-y-6">
            {/* BSK Balance Cards */}
            <div className="grid gap-4">
              <BSKBalanceCard balanceType="holding" />
            </div>

            {/* Info Banner */}
            <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Gift className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-white">Free Daily Ad Benefits</p>
                    <p className="text-slate-300">
                      • Watch <strong>1 free ad per day</strong>
                    </p>
                    <p className="text-slate-300">
                      • Earn <strong>1 BSK</strong> credited to holding balance
                    </p>
                    <p className="text-slate-300">
                      • Resets daily at midnight {settings?.daily_reset_timezone || 'UTC'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Daily Progress */}
            {settings && (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Daily Free Views</span>
                    <span className="text-sm text-slate-400">
                      {dailyViews?.free_views_used || 0} / {settings.max_free_per_day}
                    </span>
                  </div>
                  <Progress 
                    value={((dailyViews?.free_views_used || 0) / settings.max_free_per_day) * 100} 
                    className="h-2" 
                  />
                </CardContent>
              </Card>
            )}

            {/* Available Ads for Free */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">Free Daily Ads</h2>
              <p className="text-sm text-slate-400 mb-2">
                Watch 1 free ad per day to earn 1 BSK to your Holding Balance
              </p>
              
              {!user ? (
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
                  <CardContent className="p-6 text-center">
                    <Zap className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                    <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
                    <p className="text-slate-400 mb-4">
                      Sign in to start earning BSK rewards from ads
                    </p>
                    <Button onClick={() => navigate('/auth')}>
                      Sign In
                    </Button>
                  </CardContent>
                </Card>
              ) : !canClaimFreeDaily() ? (
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
                  <CardContent className="p-6 text-center">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold mb-2">Daily Limit Reached</h3>
                    <p className="text-slate-400">
                      You've used your free views for today. Check back tomorrow!
                    </p>
                  </CardContent>
                </Card>
              ) : ads.length === 0 ? (
                <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
                  <CardContent className="p-6 text-center">
                    <Clock className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold mb-2">No Ads Available</h3>
                    <p className="text-slate-400">
                      No ads available right now. Check back later!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {ads.slice(0, 3).map((ad) => (
                    <div key={ad.id} className="relative">
                      <AdBanner
                        ad={ad}
                        onAdClick={handleFreeAdClick}
                        disabled={false}
                        className="h-32"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs bg-green-600/80">
                          +{settings?.free_daily_reward_bsk || 1} BSK (Holding)
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-6">
            {/* Info Banner */}
            <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-white">Premium Subscription Benefits</p>
                    <p className="text-slate-300">
                      • Watch <strong>1 ad per day</strong> for each active subscription
                    </p>
                    <p className="text-slate-300">
                      • Earn <strong>1% daily</strong> of your subscription value (withdrawable BSK)
                    </p>
                    <p className="text-slate-300">
                      • Duration: <strong>100 days</strong> per subscription
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BSK Balance Cards */}
            <div className="grid gap-4">
              <BSKBalanceCard balanceType="withdrawable" />
            </div>

            {/* Active Subscriptions */}
            {userSubscriptions.length > 0 && (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-400" />
                    Active Subscriptions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 mb-3">
                    <span className="text-sm text-slate-300">Daily Ads Available</span>
                    <span className="font-bold text-blue-400">
                      {Math.max(0, userSubscriptions.length * (settings?.max_subscription_payout_per_day_per_tier || 1) - (dailyViews?.subscription_views_used || 0))} / {userSubscriptions.length}
                    </span>
                  </div>
                  {userSubscriptions.map((sub) => (
                    <div key={sub.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{sub.tier_bsk} BSK Tier</h4>
                          <p className="text-sm text-slate-400">{sub.daily_bsk} BSK per day (1% of {sub.tier_bsk} BSK)</p>
                        </div>
                        <Badge variant="secondary" className="bg-green-600/20 text-green-400 border-green-600/30">
                          Active
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Total Earned</span>
                          <span className="font-medium text-white">{sub.total_earned_bsk.toFixed(2)} BSK</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-400">Days Remaining</span>
                          <span className="font-medium text-white">
                            {Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} / {sub.days_total}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Available Subscription Tiers */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Purchase Subscription Tiers</CardTitle>
                <p className="text-slate-400 text-sm">
                  Pay with BSK at 1:1 rate. Watch 1 ad daily per subscription to earn 1% daily (withdrawable) for 100 days.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {tiers.map((tier) => {
                    const requiredBSK = tier.tier_bsk;
                    const canAfford = (bskBalances?.withdrawable_balance || 0) >= requiredBSK;
                    const isPurchasing = purchasingTier === tier.id;
                    
                    return (
                      <div key={tier.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-lg">{tier.tier_bsk} BSK Tier</div>
                            <div className="text-sm text-slate-400">
                              {tier.daily_bsk} BSK/day × {tier.duration_days} days
                            </div>
                            <div className="text-xs text-green-400">
                              1 ad/day • Total: {tier.daily_bsk * tier.duration_days} BSK (Withdrawable)
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {requiredBSK.toFixed(2)} BSK
                            </div>
                            <Button
                              size="sm"
                              disabled={!canAfford || isPurchasing || !user}
                              onClick={() => handlePurchaseSubscription(tier.id, tier.tier_bsk)}
                              className={cn(
                                "mt-2",
                                canAfford 
                                  ? "bg-green-600 hover:bg-green-700" 
                                  : "bg-slate-600"
                              )}
                            >
                              {isPurchasing ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                                  Purchasing...
                                </>
                              ) : canAfford ? (
                                "Purchase"
                              ) : (
                                "Insufficient BSK"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Payment Info */}
                <div className="mt-4 p-3 bg-blue-600/10 rounded-lg border border-blue-600/20">
                  <div className="text-center text-sm text-slate-400">
                    All prices are in BSK tokens
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Ads */}
            {userSubscriptions.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-2">Subscription Ads</h2>
                  <p className="text-sm text-slate-400">
                    Watch 1 ad per subscription per day to earn your 1% daily returns (withdrawable)
                  </p>
                </div>
                
                {/* Daily Usage Tracker */}
                {settings && (
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Today's Subscription Ads</span>
                        <span className="text-sm text-slate-400">
                          {dailyViews?.subscription_views_used || 0} / {userSubscriptions.length}
                        </span>
                      </div>
                      <Progress 
                        value={((dailyViews?.subscription_views_used || 0) / userSubscriptions.length) * 100} 
                        className="h-2" 
                      />
                      <div className="mt-2 text-xs text-green-400">
                        💰 Daily reward: {getActiveSubscriptionDailyReward()} BSK (Withdrawable)
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {ads.length === 0 ? (
                  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
                    <CardContent className="p-6 text-center">
                      <Clock className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                      <h3 className="text-lg font-semibold mb-2">No Ads Available</h3>
                      <p className="text-slate-400">
                        {settings?.auto_credit_no_inventory 
                          ? "Your rewards will be auto-credited due to no inventory"
                          : "No ads available right now. Check back later!"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {ads.slice(0, 5).map((ad) => (
                      <div key={ad.id} className="relative">
                        <AdBanner
                          ad={ad}
                          onAdClick={handleSubscriptionAdClick}
                          disabled={false}
                          className="h-32"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge variant="default" className="text-xs bg-blue-600/80">
                            +{getActiveSubscriptionDailyReward()} BSK (Withdrawable)
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdvertisingMiningScreen;