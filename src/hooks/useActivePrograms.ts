import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import * as LucideIcons from "lucide-react";
import { useActivePurchaseOffersStatus } from "./useActivePurchaseOffersStatus";

export interface ActiveProgram {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
  route: string;
  category: string;
  order_index: number;
  config?: any;
}

/**
 * Hook to fetch active (live) programs for the current user
 * Falls back to default programs if database is not configured
 */
export function useActivePrograms() {
  const queryClient = useQueryClient();
  const offerStatus = useActivePurchaseOffersStatus();
  
  const REMOVED_KEYS = ['loan', 'ad_mining', 'advertising', 'lucky_draw', 'lucky-draw', 'spin_wheel', 'spin', 'insurance'];
  
  const isRemovedProgram = (module: any) => {
    const key = String(module?.key || '').toLowerCase();
    const name = String(module?.name || '').toLowerCase();
    const route = String(module?.route || '').toLowerCase();
    return REMOVED_KEYS.some(k => key.includes(k) || route.includes(`/${k}`)) ||
      key.includes('loan') || name.includes('loan') || route.includes('/loans');
  };
  
  const { data: programs, isLoading, error } = useQuery({
    queryKey: ['active-programs'],
    queryFn: async () => {
      try {
        // First try to fetch all live program modules
        const { data: modules, error: modulesError } = await supabase
          .from('program_modules')
          .select('*')
          .eq('status', 'live')
          .order('order_index', { ascending: true });
        
        if (modulesError) {
          console.error('Failed to fetch program modules:', modulesError);
          return null;
        }
        
        if (!modules || modules.length === 0) {
          console.warn('No live programs found in database');
          return null;
        }

        // Now fetch published configs separately
        const { data: configs, error: configsError } = await supabase
          .from('program_configs')
          .select('*')
          .eq('is_current', true)
          .eq('status', 'published');
        
        if (configsError) {
          console.warn('Failed to fetch program configs:', configsError);
        }

        // Create a map of configs by module_id for easy lookup
        const configMap = new Map(
          configs?.map(config => [config.module_id, config.config_json]) || []
        );

        // Hard-remove decommissioned loans from user-facing program lists
        const safeModules = modules.filter((m) => !isRemovedProgram(m));

        // Transform modules to UI format, using configs when available
        const programList = safeModules.map(module => {
          const config = configMap.get(module.id) as any || {};
          
          return {
            id: module.id,
            key: module.key,
            name: module.name,
            description: config?.description || module.name,
            icon: module.icon || 'Box',
            badge: config?.badge,
            badgeColor: config?.badgeColor,
            route: module.route,
            category: module.category,
            order_index: module.order_index,
            config: config
          } as ActiveProgram;
        });

        console.log(`✅ Loaded ${programList.length} programs from database (${configs?.length || 0} with configs)`);
        return programList;
        
      } catch (err) {
        console.error('Error loading programs:', err);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Set up real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('program-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'program_modules' },
        () => {
          console.log('Program modules changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['active-programs'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'program_configs' },
        () => {
          console.log('Program configs changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['active-programs'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bsk_purchase_bonuses' },
        () => {
          console.log('BSK purchase offers changed, invalidating queries');
          queryClient.invalidateQueries({ queryKey: ['active-programs'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Default fallback programs if database is empty or error
  const defaultPrograms: ActiveProgram[] = [
    {
      id: "purchase",
      key: "bsk-bonus",
      name: "Purchase",
      description: "Get 50% extra!",
      icon: "Coins",
      badge: "NEW",
      badgeColor: "bg-primary/20 text-primary",
      route: "/app/programs/bsk-bonus",
      category: "finance",
      order_index: 4
    },
    {
      id: "referrals",
      key: "referrals",
      name: "Referrals",
      description: "Earn commissions",
      icon: "Users",
      route: "/app/programs/referrals",
      category: "earn",
      order_index: 5
    },
    {
      id: "staking",
      key: "staking",
      name: "Staking",
      description: "Earn passive rewards",
      icon: "Star",
      route: "/app/programs/staking",
      category: "finance",
      order_index: 6
    },
    {
      id: "badge-subscription",
      key: "badge-subscription",
      name: "Badge System",
      description: "Unlock levels & earn more",
      icon: "Shield",
      badge: "EXCLUSIVE",
      badgeColor: "bg-purple-500/20 text-purple-400",
      route: "/app/programs/badge-subscription",
      category: "rewards",
      order_index: 10
    }
  ];

  // Create dynamic BSK purchase tile if offers are active
  let finalPrograms = programs || defaultPrograms;
  
  if (offerStatus.hasActiveOffers && offerStatus.bestOffer) {
    const totalBonus = (offerStatus.bestOffer.withdrawable_bonus_percent || 0) + 
                       (offerStatus.bestOffer.holding_bonus_percent || 0);
    
    const dynamicBSKProgram: ActiveProgram = {
      id: 'bsk-purchase-dynamic',
      key: 'bsk_purchase',
      name: 'BSK Purchase',
      description: `${totalBonus}% Bonus - Limited Time!`,
      icon: 'Gift',
      badge: 'HOT',
      badgeColor: 'bg-danger/20 text-danger',
      route: '/app/programs/bsk-bonus',
      category: 'earn',
      order_index: -1,
      config: {
        isDynamic: true,
        offerCount: offerStatus.offerCount,
        timeRemaining: offerStatus.timeRemaining,
        isEndingSoon: offerStatus.isEndingSoon,
        endTime: offerStatus.bestOffer.end_at
      }
    };
    
    // Insert at the top of the list
    finalPrograms = [dynamicBSKProgram, ...finalPrograms];
  }

  return {
    programs: finalPrograms,
    isLoading: isLoading || offerStatus.isLoading,
    isUsingDefaults: !programs,
    error
  };
}

/**
 * Helper to get the Lucide icon component from icon name string
 */
export function getLucideIcon(iconName: string): React.ComponentType<any> {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Box;
}
