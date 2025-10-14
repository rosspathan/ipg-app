import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import * as LucideIcons from "lucide-react";

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
  const { data: programs, isLoading, error } = useQuery({
    queryKey: ['active-programs'],
    queryFn: async () => {
      // Fetch live program modules with their current configs
      const { data: modules, error: modulesError } = await supabase
        .from('program_modules')
        .select(`
          *,
          program_configs!inner(
            config_json,
            is_current,
            status
          )
        `)
        .eq('status', 'live')
        .eq('program_configs.is_current', true)
        .eq('program_configs.status', 'published')
        .order('order_index', { ascending: true });
      
      if (modulesError) {
        console.warn('Failed to fetch programs from database:', modulesError);
        return null; // Return null to trigger fallback
      }
      
      if (!modules || modules.length === 0) {
        console.info('No programs configured in database, using defaults');
        return null; // Return null to trigger fallback
      }

      // Transform database programs to UI format
      return modules.map(module => {
        const configData = Array.isArray(module.program_configs) 
          ? module.program_configs[0]?.config_json 
          : module.program_configs;
        
        // Cast config to object to access properties
        const config = configData as any;

        return {
          id: module.id,
          key: module.key,
          name: module.name,
          description: config?.description || config?.subtitle || 'Program description',
          icon: module.icon || 'Box',
          badge: config?.badge,
          badgeColor: config?.badgeColor,
          route: module.route,
          category: module.category,
          order_index: module.order_index,
          config: config
        } as ActiveProgram;
      });
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1
  });

  // Default fallback programs if database is empty or error
  const defaultPrograms: ActiveProgram[] = [
    {
      id: "advertising",
      key: "advertising",
      name: "Ad Mining",
      description: "Watch ads & earn",
      icon: "Monitor",
      badge: "DAILY",
      badgeColor: "bg-success/20 text-success",
      route: "/app/programs/advertising",
      category: "earn",
      order_index: 1
    },
    {
      id: "lucky-draw",
      key: "lucky-draw",
      name: "Lucky Draw",
      description: "Win big prizes",
      icon: "Target",
      badge: "HOT",
      badgeColor: "bg-danger/20 text-danger",
      route: "/app/programs/lucky-draw",
      category: "games",
      order_index: 2
    },
    {
      id: "spin-wheel",
      key: "spin",
      name: "Spin Wheel",
      description: "Daily spins",
      icon: "Trophy",
      badge: "LIVE",
      badgeColor: "bg-warning/20 text-warning",
      route: "/app/programs/spin",
      category: "games",
      order_index: 3
    },
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
      id: "loans",
      key: "loans",
      name: "Loans",
      description: "0% interest",
      icon: "TrendingUp",
      route: "/app/programs/loans",
      category: "finance",
      order_index: 7
    },
    {
      id: "insurance",
      key: "insurance",
      name: "Insurance",
      description: "Protect assets",
      icon: "Shield",
      route: "/app/programs/insurance",
      category: "finance",
      order_index: 8
    }
  ];

  return {
    programs: programs || defaultPrograms,
    isLoading,
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
