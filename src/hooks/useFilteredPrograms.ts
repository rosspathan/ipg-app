import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSession } from './useAuthSession';

export interface ProgramAccessRequirements {
  kycLevel?: 'L0' | 'L1' | 'L2';
  badgeRequired?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'vip';
  minBalance?: number;
  allowedRegions?: string[];
  requiredRoles?: string[];
}

export interface ProgramWithAccess {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon?: string;
  route?: string;
  category?: string;
  order_index?: number;
  badge?: string;
  badgeColor?: string;
  config?: any;
  isLocked: boolean;
  lockReasons: string[];
  requirements?: ProgramAccessRequirements;
}

export function useFilteredPrograms(programs: any[]) {
  const { userId } = useAuthSession();

  // Fetch user profile data
  const { data: profile } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('user_id', userId)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user badge status
  const { data: badgeStatus } = useQuery({
    queryKey: ['user-badge', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('user_badge_status')
        .select('current_badge')
        .eq('user_id', userId)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user BSK balance
  const { data: bskBalance } = useQuery({
    queryKey: ['user-bsk-balance', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from('user_bsk_balances')
        .select('withdrawable_balance, holding_balance')
        .eq('user_id', userId)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      return data?.map(r => r.role) || [];
    },
    enabled: !!userId,
  });

  // Fetch visibility rules for all programs
  const { data: visibilityRules } = useQuery({
    queryKey: ['program-visibility-rules'],
    queryFn: async () => {
      const { data } = await supabase
        .from('program_visibility_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      return data || [];
    },
  });

  const filteredPrograms = useMemo(() => {
    if (!programs) return [];

    return programs.map((program): ProgramWithAccess => {
      const rules = visibilityRules?.filter(r => r.module_id === program.id) || [];
      
      // If no rules, program is accessible to everyone
      if (rules.length === 0) {
        return {
          ...program,
          isLocked: false,
          lockReasons: [],
        };
      }

      // Check each rule
      const lockReasons: string[] = [];
      const requirements: ProgramAccessRequirements = {};

      rules.forEach(rule => {
        const config = rule.rule_config as any;
        
        switch (rule.rule_type) {
          case 'kyc_level':
            const requiredKyc = config?.level || 'L0';
            requirements.kycLevel = requiredKyc;
            // For now, assume L0 - can be enhanced when KYC is implemented
            const userKyc = 'L0';
            const kycLevels = ['L0', 'L1', 'L2'];
            if (kycLevels.indexOf(userKyc) < kycLevels.indexOf(requiredKyc)) {
              lockReasons.push(`Complete ${requiredKyc} KYC verification`);
            }
            break;

          case 'badge':
            const requiredBadge = config?.badge?.toLowerCase();
            requirements.badgeRequired = requiredBadge;
            const userBadge = badgeStatus?.current_badge?.toLowerCase() || 'none';
            const badgeLevels = ['none', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'vip'];
            if (badgeLevels.indexOf(userBadge) < badgeLevels.indexOf(requiredBadge)) {
              lockReasons.push(`Unlock ${requiredBadge.charAt(0).toUpperCase() + requiredBadge.slice(1)} badge`);
            }
            break;

          case 'balance_threshold':
            const minBalance = config?.min_balance || 0;
            requirements.minBalance = minBalance;
            const totalBalance = (bskBalance?.withdrawable_balance || 0) + (bskBalance?.holding_balance || 0);
            if (totalBalance < minBalance) {
              lockReasons.push(`Maintain minimum ${minBalance} BSK balance`);
            }
            break;

          case 'region':
            const allowedRegions = config?.regions || [];
            requirements.allowedRegions = allowedRegions;
            // Region check can be enhanced when region is added to profiles
            break;

          case 'user_segment':
            const requiredRoles = config?.roles || [];
            requirements.requiredRoles = requiredRoles;
            if (requiredRoles.length > 0) {
              const hasRequiredRole = requiredRoles.some((role: string) => userRoles?.includes(role as any));
              if (!hasRequiredRole) {
                lockReasons.push(`Required role: ${requiredRoles.join(' or ')}`);
              }
            }
            break;
        }
      });

      return {
        ...program,
        isLocked: lockReasons.length > 0,
        lockReasons,
        requirements,
      };
    });
  }, [programs, visibilityRules, profile, badgeStatus, bskBalance, userRoles]);

  return { programs: filteredPrograms, isLoading: !programs };
}
