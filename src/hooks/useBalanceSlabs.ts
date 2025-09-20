import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface BalanceSlab {
  id: string;
  name: string;
  balance_metric: 'MAIN' | 'TOTAL' | 'BONUS_INCLUDED';
  base_currency: string;
  min_balance: number;
  max_balance: number | null;
  max_direct_referrals: number;
  unlocked_levels: number;
  notes: string | null;
  is_active: boolean;
}

export interface UserReferralState {
  user_id: string;
  current_slab_id: string | null;
  current_balance: number;
  direct_referral_count: number;
  last_evaluated_at: string;
}

export interface GlobalSettings {
  id: string;
  default_balance_metric: 'MAIN' | 'TOTAL' | 'BONUS_INCLUDED';
  base_currency: string;
  invite_policy: 'BLOCK_WHEN_FULL' | 'WAITLIST';
  reevaluate_on_balance_change: boolean;
  reevaluate_threshold_percent: number;
}

export const useBalanceSlabs = () => {
  const [balanceSlabs, setBalanceSlabs] = useState<BalanceSlab[]>([]);
  const [userState, setUserState] = useState<UserReferralState | null>(null);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [currentSlab, setCurrentSlab] = useState<BalanceSlab | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuthUser();

  // Fetch balance slabs
  const fetchBalanceSlabs = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_balance_slabs')
        .select('*')
        .eq('is_active', true)
        .order('min_balance', { ascending: true });
      
      if (error) throw error;
      setBalanceSlabs(data || []);
    } catch (error) {
      console.error('Error fetching balance slabs:', error);
    }
  };

  // Fetch global settings
  const fetchGlobalSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_global_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      setGlobalSettings(data);
    } catch (error) {
      console.error('Error fetching global settings:', error);
    }
  };

  // Fetch user referral state
  const fetchUserState = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('referral_user_state')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setUserState(data);

      // If user has a current slab, fetch its details
      if (data?.current_slab_id) {
        const { data: slabData, error: slabError } = await supabase
          .from('referral_balance_slabs')
          .select('*')
          .eq('id', data.current_slab_id)
          .maybeSingle();
        
        if (!slabError && slabData) {
          setCurrentSlab(slabData);
        }
      }
    } catch (error) {
      console.error('Error fetching user state:', error);
    }
  };

  // Update user referral state
  const updateUserState = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.rpc('update_user_referral_state', {
        p_user_id: user.id
      });
      
      if (error) throw error;
      await fetchUserState();
    } catch (error) {
      console.error('Error updating user state:', error);
      toast({
        title: "Error",
        description: "Failed to update referral state",
        variant: "destructive",
      });
    }
  };

  // Get remaining direct referral capacity
  const getRemainingCapacity = (): number => {
    if (!currentSlab || !userState) return 0;
    return Math.max(0, currentSlab.max_direct_referrals - userState.direct_referral_count);
  };

  // Check if user can make new referrals
  const canMakeReferral = (): boolean => {
    return getRemainingCapacity() > 0;
  };

  // Get next slab for upgrade hint
  const getNextSlab = (): BalanceSlab | null => {
    if (!currentSlab) return balanceSlabs[0] || null;
    
    const currentIndex = balanceSlabs.findIndex(slab => slab.id === currentSlab.id);
    return currentIndex >= 0 && currentIndex < balanceSlabs.length - 1 
      ? balanceSlabs[currentIndex + 1] 
      : null;
  };

  // Get upgrade hint message
  const getUpgradeHint = (): string | null => {
    const nextSlab = getNextSlab();
    if (!nextSlab || !userState) return null;
    
    const requiredBalance = nextSlab.min_balance - userState.current_balance;
    if (requiredBalance <= 0) return null;
    
    return `Hold ≥ ${nextSlab.min_balance.toLocaleString()} ${nextSlab.base_currency} to unlock ${nextSlab.name} tier (${nextSlab.max_direct_referrals} direct referrals, L${nextSlab.unlocked_levels} rewards)`;
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchBalanceSlabs(),
          fetchGlobalSettings(),
          fetchUserState()
        ]);
      } catch (error) {
        console.error('Error loading balance slab data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    const balanceSlabsSubscription = supabase
      .channel('balance_slabs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_balance_slabs' }, fetchBalanceSlabs)
      .subscribe();

    const userStateSubscription = supabase
      .channel('user_state_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'referral_user_state',
        filter: `user_id=eq.${user?.id}` 
      }, fetchUserState)
      .subscribe();

    return () => {
      supabase.removeChannel(balanceSlabsSubscription);
      supabase.removeChannel(userStateSubscription);
    };
  }, [user?.id]);

  return {
    balanceSlabs,
    userState,
    globalSettings,
    currentSlab,
    loading,
    getRemainingCapacity,
    canMakeReferral,
    getNextSlab,
    getUpgradeHint,
    updateUserState,
    refetch: async () => {
      await Promise.all([
        fetchBalanceSlabs(),
        fetchGlobalSettings(),
        fetchUserState()
      ]);
    }
  };
};