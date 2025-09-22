import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Coins, Eye, Timer, Play, CheckCircle, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useWeb3 } from '@/contexts/Web3Context';
import { hasLocalSecurity } from '@/utils/localSecurityStorage';
import { AdBanner } from '@/components/AdBanner';
import BonusBalanceCard from '@/components/BonusBalanceCard';
import { cn } from '@/lib/utils';

interface Ad {
  id: string;
  title: string;
  image_url: string;
  square_image_url?: string;
  target_url: string;
  reward_bsk: number;
  required_view_time: number;
  placement: string;
  max_impressions_per_user_per_day: number;
  status: string;
}

interface UserAdClick {
  id: string;
  ad_id: string;
  started_at: string;
  completed_at?: string;
  rewarded: boolean;
  reward_bsk: number;
}

const AdMiningScreen: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, session } = useAuthUser();
  const { wallet, isConnected } = useWeb3();
  
  const [ads, setAds] = useState<Ad[]>([]);
  const [userClicks, setUserClicks] = useState<UserAdClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [isViewing, setIsViewing] = useState(false);
  const [viewProgress, setViewProgress] = useState(0);
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [bonusBalanceKey, setBonusBalanceKey] = useState(0);

  useEffect(() => {
    loadAds();
    loadUserStats();
  }, []);

  const isAuthenticated = !!(user && session) || isConnected || hasLocalSecurity();

  const loadAds = async () => {
    try {
      const { data: adsData, error } = await supabase
        .from('ads')
        .select('*')
        .eq('status', 'active')
        .gte('end_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(adsData || []);

      // Load user's ad clicks for today
      if (isAuthenticated) {
        const today = new Date().toISOString().split('T')[0];
        const { data: clicksData } = await supabase
          .from('ad_clicks')
          .select('*')
          .gte('started_at', `${today}T00:00:00.000Z`)
          .lt('started_at', `${today}T23:59:59.999Z`)
          .order('started_at', { ascending: false });

        setUserClicks(clicksData || []);
      }
    } catch (error) {
      console.error('Error loading ads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load ads',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    if (!isAuthenticated) return;
    
    try {
      // Calculate daily earnings from today's completed ad views
      const today = new Date().toISOString().split('T')[0];
      const { data: todayClicks } = await supabase
        .from('ad_clicks')
        .select('reward_bsk')
        .eq('rewarded', true)
        .gte('started_at', `${today}T00:00:00.000Z`)
        .lt('started_at', `${today}T23:59:59.999Z`);

      const earnings = todayClicks?.reduce((sum, click) => sum + (click.reward_bsk || 0), 0) || 0;
      setDailyEarnings(earnings);
      
      // Set daily limit (this could come from user's subscription tier)
      setDailyLimit(50); // Default BSK limit per day
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const getAvailableAds = () => {
    if (!isAuthenticated) return ads;
    
    return ads.filter(ad => {
      const todayClicks = userClicks.filter(click => click.ad_id === ad.id);
      return todayClicks.length < ad.max_impressions_per_user_per_day;
    });
  };

  const getUserClicksForAd = (adId: string) => {
    return userClicks.filter(click => click.ad_id === adId).length;
  };

  const handleAdClick = async (adId: string) => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please complete onboarding to view ads and earn rewards',
        variant: 'destructive'
      });
      return;
    }

    const ad = ads.find(a => a.id === adId);
    if (!ad) return;

    // Check daily limit
    if (dailyEarnings >= dailyLimit) {
      toast({
        title: 'Daily Limit Reached',
        description: `You've reached your daily earning limit of ${dailyLimit} BSK`,
        variant: 'destructive'
      });
      return;
    }

    // Check if user has reached the per-ad daily limit
    const clicksToday = getUserClicksForAd(adId);
    if (clicksToday >= ad.max_impressions_per_user_per_day) {
      toast({
        title: 'Ad Limit Reached',
        description: 'You\'ve viewed this ad the maximum times today',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Record ad impression
      await supabase
        .from('ad_impressions')
        .insert({
          user_id: user?.id || 'anonymous',
          ad_id: adId,
          placement: ad.placement
        });

      // Start ad click tracking
      const { data: clickData, error } = await supabase
        .from('ad_clicks')
        .insert({
          user_id: user?.id || 'anonymous',
          ad_id: adId,
          subscription_tier: 'free' // This could come from user profile
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentAd(ad);
      setIsViewing(true);
      setViewProgress(0);

      // Start viewing progress
      startAdViewing(clickData.id, ad);
    } catch (error) {
      console.error('Error starting ad view:', error);
      toast({
        title: 'Error',
        description: 'Failed to start ad viewing',
        variant: 'destructive'
      });
    }
  };

  const startAdViewing = (clickId: string, ad: Ad) => {
    const duration = ad.required_view_time * 1000; // Convert to milliseconds
    const interval = 100; // Update every 100ms
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      setViewProgress(progress);

      if (progress >= 100) {
        clearInterval(timer);
        completeAdViewing(clickId, ad);
      }
    }, interval);
  };

  const completeAdViewing = async (clickId: string, ad: Ad) => {
    try {
      // Update ad click as completed and rewarded
      const { error } = await supabase
        .from('ad_clicks')
        .update({
          completed_at: new Date().toISOString(),
          rewarded: true,
          reward_bsk: ad.reward_bsk
        })
        .eq('id', clickId);

      if (error) throw error;

      // Add BSK reward to user's bonus balance
      await supabase
        .from('bonus_ledger')
        .insert({
          user_id: user?.id || 'anonymous',
          type: 'ad_reward',
          amount_bsk: ad.reward_bsk,
          usd_value: ad.reward_bsk * 0.1, // Assuming BSK = $0.10
          meta_json: {
            ad_id: ad.id,
            ad_title: ad.title,
            click_id: clickId
          }
        });

      toast({
        title: '🎉 Reward Earned!',
        description: `You earned ${ad.reward_bsk} BSK for viewing this ad!`,
      });

      // Update states
      setDailyEarnings(prev => prev + ad.reward_bsk);
      setBonusBalanceKey(prev => prev + 1); // Force bonus balance update
      setIsViewing(false);
      setCurrentAd(null);
      setViewProgress(0);

      // Reload data
      loadAds();
      loadUserStats();

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

  const availableAds = getAvailableAds();
  const progressPercentage = dailyLimit > 0 ? (dailyEarnings / dailyLimit) * 100 : 0;

  if (loading) {
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
            Ad Mining
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
                Watch for {currentAd.required_view_time} seconds to earn {currentAd.reward_bsk} BSK
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
                {Math.ceil(((100 - viewProgress) / 100) * currentAd.required_view_time)} seconds remaining
              </div>
              {currentAd.target_url && (
                <p className="text-xs text-slate-500 text-center">
                  Ad will open after completion
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      <div className="px-4 pb-24 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Coins className="h-6 w-6 mx-auto mb-2 text-green-400" />
              <div className="text-xl font-bold text-green-400">{dailyEarnings}</div>
              <div className="text-xs text-green-300">BSK Earned Today</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30 backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Eye className="h-6 w-6 mx-auto mb-2 text-blue-400" />
              <div className="text-xl font-bold text-blue-400">{availableAds.length}</div>
              <div className="text-xs text-blue-300">Ads Available</div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Progress */}
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Daily Progress</span>
              <span className="text-sm text-slate-400">{dailyEarnings} / {dailyLimit} BSK</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </CardContent>
        </Card>

        {/* Bonus Balance */}
        <BonusBalanceCard key={bonusBalanceKey} className="bg-slate-800/50 backdrop-blur-sm border-slate-700" />

        {/* Available Ads */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Available Ads</h2>
          
          {!isAuthenticated ? (
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
              <CardContent className="p-6 text-center">
                <Zap className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
                <p className="text-slate-400 mb-4">
                  Complete onboarding to start earning BSK rewards from ads
                </p>
                <Button 
                  onClick={() => navigate('/onboarding')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ) : availableAds.length === 0 ? (
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700">
              <CardContent className="p-6 text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold mb-2">No More Ads</h3>
                <p className="text-slate-400">
                  You've viewed all available ads for today. Check back tomorrow!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {availableAds.map((ad) => {
                const clicksToday = getUserClicksForAd(ad.id);
                const remaining = ad.max_impressions_per_user_per_day - clicksToday;
                const isDisabled = dailyEarnings >= dailyLimit || remaining <= 0;
                
                return (
                  <div key={ad.id} className="relative">
                    <AdBanner
                      ad={ad}
                      onAdClick={handleAdClick}
                      disabled={isDisabled}
                      className="h-32"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="text-xs">
                        {remaining} left today
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdMiningScreen;