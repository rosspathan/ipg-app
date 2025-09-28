import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface BSKPromotionCampaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'live' | 'paused' | 'ended';
  start_at: string | null;
  end_at: string | null;
  min_purchase_inr: number;
  max_purchase_inr: number;
  bonus_percent: number;
  per_user_limit: 'once' | 'once_per_campaign' | 'unlimited';
  destination: 'withdrawable' | 'holding';
  vesting_enabled: boolean;
  vesting_duration_days: number;
  global_budget_bsk: number | null;
  global_budget_used_bsk: number;
  eligible_channels: string[];
  rate_snapshot_bsk_inr: number;
  created_at: string;
  updated_at: string;
}

export interface UserPromotionClaim {
  id: string;
  user_id: string;
  campaign_id: string;
  claims_count: number;
  first_claim_at: string | null;
  last_claim_at: string | null;
  total_bonus_bsk: number;
}

export interface BSKBonusEvent {
  id: string;
  user_id: string;
  campaign_id: string;
  purchase_id: string;
  channel: 'inr_onramp' | 'swap_ipg_bsk' | 'swap_crypto_bsk';
  purchase_inr: number;
  effective_purchase_inr: number;
  rate_snapshot_bsk_inr: number;
  bonus_bsk: number;
  destination: 'withdrawable' | 'holding';
  status: 'pending' | 'settled' | 'void' | 'clawed_back';
  created_at: string;
}

export const useBSKPromotion = () => {
  const [activeCampaign, setActiveCampaign] = useState<BSKPromotionCampaign | null>(null);
  const [userClaim, setUserClaim] = useState<UserPromotionClaim | null>(null);
  const [bonusHistory, setBonusHistory] = useState<BSKBonusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load active campaign and user data
  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch active campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('bsk_bonus_campaigns')
        .select('*')
        .eq('status', 'live')
        .or('start_at.is.null,start_at.lte.now()')
        .or('end_at.is.null,end_at.gte.now()')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (campaignError) {
        console.error('Error fetching campaign:', campaignError);
        return;
      }

      setActiveCampaign(campaign);

      if (campaign) {
        // Fetch user claim data
        const { data: claim, error: claimError } = await supabase
          .from('user_promotion_claims')
          .select('*')
          .eq('user_id', user.id)
          .eq('campaign_id', campaign.id)
          .maybeSingle();

        if (claimError && claimError.code !== 'PGRST116') {
          console.error('Error fetching user claim:', claimError);
        } else {
          setUserClaim(claim);
        }
      }

      // Fetch bonus history
      const { data: history, error: historyError } = await supabase
        .from('bsk_bonus_events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (historyError) {
        console.error('Error fetching bonus history:', historyError);
      } else {
        setBonusHistory(history || []);
      }

    } catch (error) {
      console.error('Error loading promotion data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if user is eligible for the promotion
  const checkEligibility = (purchaseAmount: number): {
    eligible: boolean;
    reason?: string;
    shortfall?: number;
  } => {
    if (!activeCampaign) {
      return { eligible: false, reason: 'No active campaign' };
    }

    if (purchaseAmount < activeCampaign.min_purchase_inr) {
      return {
        eligible: false,
        reason: 'Below minimum purchase amount',
        shortfall: activeCampaign.min_purchase_inr - purchaseAmount
      };
    }

    if (activeCampaign.per_user_limit === 'once' && userClaim && userClaim.claims_count >= 1) {
      return { eligible: false, reason: 'Already claimed once' };
    }

    return { eligible: true };
  };

  // Process a BSK purchase for bonus
  const processPurchaseBonus = async (
    purchaseId: string,
    channel: 'inr_onramp' | 'swap_ipg_bsk' | 'swap_crypto_bsk',
    purchaseInr: number
  ) => {
    if (!user || !activeCampaign) {
      throw new Error('User not authenticated or no active campaign');
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.rpc('process_bsk_bonus_purchase', {
        p_user_id: user.id,
        p_purchase_id: purchaseId,
        p_channel: channel,
        p_purchase_inr: purchaseInr
      }) as { data: any, error: any };

      if (error) {
        throw error;
      }

      const result = data as any;
      if (!result?.success) {
        throw new Error(result?.reason || 'Failed to process bonus');
      }

      toast({
        title: "Bonus Awarded! 🎉",
        description: `You received ${result.bonus_bsk} BSK as a ${activeCampaign.bonus_percent}% bonus`,
      });

      // Reload data to show updated status
      await loadData();

      return data;
    } catch (error: any) {
      toast({
        title: "Bonus Processing Failed",
        description: error.message || 'Failed to process purchase bonus',
        variant: "destructive",
      });
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  // Calculate expected bonus for purchase amount
  const calculateExpectedBonus = (purchaseAmount: number): number => {
    if (!activeCampaign) return 0;

    const effectiveAmount = Math.min(purchaseAmount, activeCampaign.max_purchase_inr);
    const bonusInr = effectiveAmount * (activeCampaign.bonus_percent / 100);
    return bonusInr / activeCampaign.rate_snapshot_bsk_inr;
  };

  // Get user's eligibility status
  const getUserStatus = (): 'eligible' | 'claimed' | 'ineligible' | 'no_campaign' => {
    if (!activeCampaign) return 'no_campaign';
    if (userClaim && userClaim.claims_count >= 1 && activeCampaign.per_user_limit === 'once') {
      return 'claimed';
    }
    return 'eligible';
  };

  // Get time remaining for campaign
  const getTimeRemaining = (): { days: number; hours: number; minutes: number } | null => {
    if (!activeCampaign?.end_at) return null;

    const now = new Date();
    const endTime = new Date(activeCampaign.end_at);
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  };

  useEffect(() => {
    loadData();
  }, [user]);

  return {
    activeCampaign,
    userClaim,
    bonusHistory,
    loading,
    processing,
    checkEligibility,
    processPurchaseBonus,
    calculateExpectedBonus,
    getUserStatus,
    getTimeRemaining,
    refetch: loadData
  };
};