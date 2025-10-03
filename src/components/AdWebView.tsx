import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, ExternalLink, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdWebViewProps {
  isOpen: boolean;
  onClose: () => void;
  ad: {
    id: string;
    title: string;
    target_url: string | null;
    reward_bsk: number;
    required_view_time: number;
  };
  onRewardClaimed?: (reward: number) => void;
}

export const AdWebView: React.FC<AdWebViewProps> = ({
  isOpen,
  onClose,
  ad,
  onRewardClaimed
}) => {
  const [timeViewed, setTimeViewed] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const clickIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startTracking();
    } else {
      stopTracking();
      resetState();
    }

    return () => stopTracking();
  }, [isOpen]);

  useEffect(() => {
    // Track app visibility
    const handleVisibilityChange = () => {
      setIsActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const startTracking = async () => {
    startTimeRef.current = Date.now();
    
    // Create ad click record
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const { data, error } = await supabase
        .from('ad_clicks')
        .insert({
          user_id: user.user.id,
          ad_id: ad.id,
          subscription_tier: 'free' // TODO: Get actual tier from user
        })
        .select()
        .single();

      if (error) throw error;
      clickIdRef.current = data.id;
    } catch (error) {
      console.error('Error tracking ad click:', error);
    }

    // Start timer
    intervalRef.current = setInterval(() => {
      if (isActive) {
        setTimeViewed(prev => {
          const newTime = prev + 1;
          if (newTime >= ad.required_view_time && !canClaim) {
            setCanClaim(true);
          }
          return newTime;
        });
      }
    }, 1000);
  };

  const stopTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetState = () => {
    setTimeViewed(0);
    setCanClaim(false);
    setClaiming(false);
    clickIdRef.current = null;
  };

  const handleClaim = async () => {
    if (!canClaim || claiming || !clickIdRef.current) return;

    setClaiming(true);
    
    try {
      // Update click record as completed and rewarded
      const { error: updateError } = await supabase
        .from('ad_clicks')
        .update({
          completed_at: new Date().toISOString(),
          rewarded: true,
          reward_bsk: ad.reward_bsk
        })
        .eq('id', clickIdRef.current);

      if (updateError) throw updateError;

      // Create bonus ledger entry
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('User not authenticated');

      const { error: ledgerError } = await supabase
        .from('bonus_ledger')
        .insert({
          user_id: user.user.id,
          type: 'ad_reward',
          amount_bsk: ad.reward_bsk,
          meta_json: {
            ad_id: ad.id,
            ad_title: ad.title,
            click_id: clickIdRef.current,
            view_time: timeViewed
          }
        });

      if (ledgerError) throw ledgerError;

      // Update bonus balance
      if (user?.user) {
        // Get BSK asset ID
        const { data: bskAsset } = await supabase
          .from('bonus_assets')
          .select('id')
          .eq('symbol', 'BSK')
          .single();

        if (bskAsset) {
          const { error: balanceError } = await supabase
            .from('wallet_bonus_balances')
            .upsert({
              user_id: user.user.id,
              asset_id: bskAsset.id,
              balance: ad.reward_bsk
            }, {
              onConflict: 'user_id,asset_id',
              ignoreDuplicates: false
            });

          if (balanceError) throw balanceError;
        }
      }

      toast({
        title: "Reward Claimed!",
        description: `+${ad.reward_bsk} BSK added to your bonus balance`,
      });

      onRewardClaimed?.(ad.reward_bsk);
      onClose();
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive"
      });
    }
    
    setClaiming(false);
  };

  const progress = Math.min((timeViewed / ad.required_view_time) * 100, 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-full p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm">{ad.title}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              View time: {timeViewed}s / {ad.required_view_time}s
            </span>
            <span className="font-medium text-primary">
              {ad.reward_bsk} BSK
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          {!isActive && (
            <p className="text-xs text-orange-500">
              ⚠️ Tab is not active - timer paused
            </p>
          )}
        </div>

        {/* WebView */}
        <div className="flex-1 min-h-[300px] bg-muted">
          {ad.target_url ? (
            <iframe
              src={ad.target_url}
              className="w-full h-[300px] border-0"
              title={ad.title}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          ) : (
            <div className="w-full h-[300px] flex items-center justify-center">
              <div className="text-center space-y-2 p-6">
                <p className="text-muted-foreground">
                  Watch this ad for {ad.required_view_time} seconds to earn your reward
                </p>
                <p className="text-lg font-semibold text-primary">
                  {ad.reward_bsk} BSK
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Claim Button */}
        <div className="p-4 border-t">
          <Button
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            className="w-full"
            size="lg"
          >
            {claiming ? (
              "Claiming..."
            ) : canClaim ? (
              <>
                <Coins className="w-4 h-4 mr-2" />
                Claim {ad.reward_bsk} BSK
              </>
            ) : (
              `View for ${ad.required_view_time - timeViewed}s more`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};