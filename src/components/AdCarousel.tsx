import React, { useState, useEffect } from 'react';
import { AdBanner } from '@/components/AdBanner';
import { AdWebView } from '@/components/AdWebView';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Eye, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
}

interface AdCarouselProps {
  placement: 'home_top' | 'home_mid' | 'markets_top';
  className?: string;
}

export const AdCarousel: React.FC<AdCarouselProps> = ({ placement, className }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [dailyClicks, setDailyClicks] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(1);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState('free');
  const { toast } = useToast();

  useEffect(() => {
    loadAds();
    loadUserLimits();
  }, [placement]);

  const loadAds = async () => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('placement', placement)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error loading ads:', error);
    }
  };

  const loadUserLimits = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      // If not authenticated, default to 'free' tier and allow viewing
      const uid = user?.user?.id || null;

      // Get user's subscription tier (defaulting to 'free')
      // TODO: Implement proper subscription tier detection
      const tier = 'free';
      setUserTier(tier);

      // Get tier limits
      const { data: tierData } = await supabase
        .from('subscription_tiers')
        .select('daily_rewarded_clicks')
        .eq('name', tier)
        .single();

      if (tierData) {
        setDailyLimit(tierData.daily_rewarded_clicks);
      }

      // Get today's clicks count
      const today = new Date().toISOString().split('T')[0];
      if (uid) {
        const { data: clicksData, error: clicksError } = await supabase
          .from('ad_clicks')
          .select('id')
          .eq('user_id', uid)
          .eq('rewarded', true)
          .gte('started_at', `${today}T00:00:00.000Z`)
          .lt('started_at', `${today}T23:59:59.999Z`);

        if (!clicksError) {
          setDailyClicks(clicksData?.length || 0);
        }
      } else {
        setDailyClicks(0);
      }
    } catch (error) {
      console.error('Error loading user limits:', error);
    }
    setLoading(false);
  };

  const handleAdClick = (adId: string) => {
    if (dailyClicks >= dailyLimit) {
      toast({
        title: "Daily Limit Reached",
        description: `You've reached your daily limit of ${dailyLimit} rewarded ad${dailyLimit > 1 ? 's' : ''}. Come back tomorrow!`,
        variant: "destructive"
      });
      return;
    }

    const ad = ads.find(a => a.id === adId);
    if (ad) {
      setSelectedAd(ad);
    }
  };

  const handleRewardClaimed = async (reward: number) => {
    setDailyClicks(prev => prev + 1);
    toast({
      title: "Reward Earned!",
      description: `+${reward} BSK added to your bonus balance`,
    });
  };

  const nextAd = () => {
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const prevAd = () => {
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur-sm">
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="aspect-[16/9] bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (ads.length === 0) {
    return null;
  }

  const canEarnMore = dailyClicks < dailyLimit;

  return (
    <>
      <Card className={cn("relative overflow-hidden bg-card/50 backdrop-blur-sm", className)}>
        {/* Header */}
        <div className="p-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Sponsored</span>
            <Badge variant="secondary" className="text-xs">
              Earn BSK
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {dailyClicks}/{dailyLimit} today
            </span>
            {userTier !== 'free' && (
              <Badge variant="outline" className="text-xs">
                {userTier}
              </Badge>
            )}
          </div>
        </div>

        {/* Ad Display */}
        <div className="relative px-4 pb-4">
          <AdBanner
            ad={ads[currentIndex]}
            onAdClick={handleAdClick}
            disabled={!canEarnMore}
            className="w-full"
          />

          {/* Navigation */}
          {ads.length > 1 && (
            <>
              <button
                onClick={prevAd}
                className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={nextAd}
                className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                {ads.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "w-2 h-2 rounded-full",
                      index === currentIndex ? "bg-white" : "bg-white/40"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Limit Status */}
        {!canEarnMore && (
          <div className="px-4 pb-4">
            <Card className="p-3 bg-muted/50 border-orange-200">
              <p className="text-sm text-center text-muted-foreground">
                Daily limit reached. Come back tomorrow for more rewards!
              </p>
            </Card>
          </div>
        )}
      </Card>

      {/* Ad WebView Modal */}
      {selectedAd && (
        <AdWebView
          isOpen={!!selectedAd}
          onClose={() => setSelectedAd(null)}
          ad={selectedAd}
          onRewardClaimed={handleRewardClaimed}
        />
      )}
    </>
  );
};