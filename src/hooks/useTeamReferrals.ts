import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TeamReferralSettings {
  id: string;
  enabled: boolean;
  trigger_event: 'signup_verified' | 'first_deposit' | 'badge_purchase_or_upgrade';
  spillover_to_next_eligible_upline: boolean;
  direct_referral_percent: number;
  cooloff_hours: number;
  bsk_inr_rate: number;
  region_enabled: Record<string, boolean>;
  daily_cap_per_earner?: number;
  weekly_cap_per_earner?: number;
  per_downline_event_cap?: number;
  created_at: string;
  updated_at: string;
}

export interface TeamIncomeLevel {
  id: string;
  level: number;
  bsk_reward: number;
  balance_type: 'withdrawable' | 'holding';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BadgeThreshold {
  id: string;
  badge_name: string;
  bsk_threshold: number;
  unlock_levels: number;
  bonus_bsk_holding: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VIPMilestone {
  id: string;
  vip_count_threshold: number;
  reward_type: 'bsk' | 'physical';
  reward_inr_value: number;
  reward_description: string;
  physical_reward_sku?: string;
  requires_kyc: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserVIPMilestones {
  id: string;
  user_id: string;
  direct_vip_count: number;
  last_vip_referral_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReferralLedgerEntry {
  id: string;
  user_id: string;
  source_user_id?: string;
  referrer_id?: string;
  ledger_type: 'team_income' | 'direct_badge_bonus' | 'vip_milestone_bonus' | 'vip_self_bonus';
  depth?: number;
  badge_at_event?: string;
  trigger_type?: string;
  inr_amount_snapshot: number;
  bsk_rate_snapshot: number;
  bsk_amount: number;
  status: 'pending' | 'settled' | 'void' | 'clawed_back';
  tx_refs: Record<string, any>;
  notes?: string;
  created_at: string;
  settled_at?: string;
  voided_at?: string;
}

export interface BadgePurchase {
  id: string;
  user_id: string;
  badge_name: string;
  previous_badge?: string;
  inr_amount: number;
  bsk_amount: number;
  bsk_rate_at_purchase: number;
  is_upgrade: boolean;
  payment_method: string;
  payment_ref?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface VIPMilestoneClaim {
  id: string;
  user_id: string;
  milestone_id: string;
  claimed_at: string;
  status: 'pending' | 'approved' | 'shipped' | 'completed' | 'rejected';
  fulfillment_notes?: string;
  kyc_verified: boolean;
  shipping_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const useTeamReferrals = () => {
  const [settings, setSettings] = useState<TeamReferralSettings | null>(null);
  const [teamIncomeLevels, setTeamIncomeLevels] = useState<TeamIncomeLevel[]>([]);
  const [badgeThresholds, setBadgeThresholds] = useState<BadgeThreshold[]>([]);
  const [vipMilestones, setVipMilestones] = useState<VIPMilestone[]>([]);
  const [userVipMilestones, setUserVipMilestones] = useState<UserVIPMilestones | null>(null);
  const [referralLedger, setReferralLedger] = useState<ReferralLedgerEntry[]>([]);
  const [badgePurchases, setBadgePurchases] = useState<BadgePurchase[]>([]);
  const [vipMilestoneClaims, setVipMilestoneClaims] = useState<VIPMilestoneClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch team referral settings
  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('team_referral_settings')
        .select('*')
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setSettings(data as TeamReferralSettings);
    } catch (error) {
      console.error('Error fetching team referral settings:', error);
    }
  };

  // Fetch team income levels
  const fetchTeamIncomeLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('team_income_levels')
        .select('*')
        .order('level');
      
      if (error) throw error;
      setTeamIncomeLevels((data || []) as TeamIncomeLevel[]);
    } catch (error) {
      console.error('Error fetching team income levels:', error);
    }
  };

  // Fetch badge thresholds
  const fetchBadgeThresholds = async () => {
    try {
      const { data, error } = await supabase
        .from('badge_thresholds')
        .select('*')
        .eq('is_active', true)
        .order('bsk_threshold');
      
      if (error) throw error;
      setBadgeThresholds(data || []);
    } catch (error) {
      console.error('Error fetching badge thresholds:', error);
    }
  };

  // Fetch VIP milestones
  const fetchVipMilestones = async () => {
    try {
      const { data, error } = await supabase
        .from('vip_milestones')
        .select('*')
        .eq('is_active', true)
        .order('vip_count_threshold');
      
      if (error) throw error;
      setVipMilestones((data || []) as VIPMilestone[]);
    } catch (error) {
      console.error('Error fetching VIP milestones:', error);
    }
  };

  // Fetch user VIP milestone progress
  const fetchUserVipMilestones = async (userId: string) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_vip_milestones')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setUserVipMilestones(data);
    } catch (error) {
      console.error('Error fetching user VIP milestones:', error);
    }
  };

  // Fetch referral ledger
  const fetchReferralLedger = async (userId?: string) => {
    try {
      let query = supabase
        .from('referral_ledger')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setReferralLedger((data || []) as ReferralLedgerEntry[]);
    } catch (error) {
      console.error('Error fetching referral ledger:', error);
    }
  };

  // Fetch badge purchases
  const fetchBadgePurchases = async (userId?: string) => {
    try {
      let query = supabase
        .from('badge_purchases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setBadgePurchases((data || []) as BadgePurchase[]);
    } catch (error) {
      console.error('Error fetching badge purchases:', error);
    }
  };

  // Fetch VIP milestone claims
  const fetchVipMilestoneClaims = async (userId?: string) => {
    try {
      let query = supabase
        .from('vip_milestone_claims')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setVipMilestoneClaims((data || []) as VIPMilestoneClaim[]);
    } catch (error) {
      console.error('Error fetching VIP milestone claims:', error);
    }
  };

  // Update team referral settings
  const updateSettings = async (updates: Partial<TeamReferralSettings>) => {
    try {
      const { data, error } = await supabase
        .from('team_referral_settings')
        .update(updates)
        .eq('id', settings?.id)
        .select()
        .single();
      
      if (error) throw error;
      setSettings(data as TeamReferralSettings);
      
      toast({
        title: "Success",
        description: "Team referral settings updated successfully",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update team referral settings",
        variant: "destructive",
      });
    }
  };

  // Purchase badge
  const purchaseBadge = async (badgeName: string, previousBadge?: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const badge = badgeThresholds.find(b => b.badge_name === badgeName);
      if (!badge) throw new Error('Badge not found');

      // Calculate amount (difference if upgrade)
      let bskAmount = badge.bsk_threshold;
      let isUpgrade = false;
      
      if (previousBadge) {
        const previousBadgeData = badgeThresholds.find(b => b.badge_name === previousBadge);
        if (previousBadgeData) {
          bskAmount = badge.bsk_threshold - previousBadgeData.bsk_threshold;
          isUpgrade = true;
        }
      }

      // Call edge function to process purchase
      const { data, error } = await supabase.functions.invoke('team-referral-processor', {
        body: {
          eventType: 'badge_purchase',
          data: {
            userId: user.id,
            badgeName,
            previousBadge,
            bskAmount,
            isUpgrade,
            paymentRef: `badge_${Date.now()}`
          }
        }
      });

      if (error) throw error;

      // Refresh data
      await Promise.all([
        fetchBadgePurchases(user.id),
        fetchReferralLedger(user.id),
        fetchUserVipMilestones(user.id)
      ]);

      toast({
        title: "Success",
        description: `${badgeName} badge ${isUpgrade ? 'upgraded' : 'purchased'} successfully!`,
      });

      return data;
    } catch (error) {
      console.error('Error purchasing badge:', error);
      toast({
        title: "Error",
        description: "Failed to purchase badge",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Claim VIP milestone
  const claimVipMilestone = async (milestoneId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('vip_milestone_claims')
        .insert({
          user_id: user.id,
          milestone_id: milestoneId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      await fetchVipMilestoneClaims(user.id);

      toast({
        title: "Success",
        description: "VIP milestone claim submitted successfully!",
      });

      return data;
    } catch (error) {
      console.error('Error claiming VIP milestone:', error);
      toast({
        title: "Error",
        description: "Failed to claim VIP milestone",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchSettings(),
          fetchTeamIncomeLevels(),
          fetchBadgeThresholds(),
          fetchVipMilestones()
        ]);

        // Load user-specific data if authenticated
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
          await Promise.all([
            fetchUserVipMilestones(user.id),
            fetchReferralLedger(user.id),
            fetchBadgePurchases(user.id),
            fetchVipMilestoneClaims(user.id)
          ]);
        }
      } catch (error) {
        console.error('Error loading team referral data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return {
    settings,
    teamIncomeLevels,
    badgeThresholds,
    vipMilestones,
    userVipMilestones,
    referralLedger,
    badgePurchases,
    vipMilestoneClaims,
    loading,
    updateSettings,
    purchaseBadge,
    claimVipMilestone,
    refetch: async (userId?: string) => {
      await Promise.all([
        fetchSettings(),
        fetchTeamIncomeLevels(),
        fetchBadgeThresholds(),
        fetchVipMilestones(),
        userId ? fetchUserVipMilestones(userId) : Promise.resolve(),
        fetchReferralLedger(userId),
        fetchBadgePurchases(userId),
        fetchVipMilestoneClaims(userId)
      ]);
    }
  };
};