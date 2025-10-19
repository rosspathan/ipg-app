import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProgramWithConfig {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string | null;
  currentConfig?: {
    id: string;
    version: number;
    status: string;
    config_json: any;
    published_at: string | null;
    ticket_price?: number;
    pool_size?: number;
    min_bet?: number;
    max_bet?: number;
    free_spins_per_day?: number;
    reward_per_ad?: number;
    daily_limit?: number;
  };
}

export function useProgramEconomics() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["program-economics"],
    queryFn: async () => {
      // Fetch all modules
      const { data: modules, error: modulesError } = await supabase
        .from("program_modules")
        .select("*")
        .order("name");

      if (modulesError) throw modulesError;

      // Fetch current configs for each module
      const modulesWithConfigs: ProgramWithConfig[] = await Promise.all(
        modules.map(async (module) => {
          const { data: config } = await supabase
            .from("program_configs")
            .select("*")
            .eq("module_id", module.id)
            .eq("is_current", true)
            .single();

          return {
            ...module,
            currentConfig: config
              ? {
                  ...config,
                  ...(typeof config.config_json === 'object' && config.config_json !== null ? config.config_json : {}),
                }
              : undefined,
          };
        })
      );

      return modulesWithConfigs;
    },
  });

  return {
    programs: data || [],
    isLoading,
    error,
    refetch,
  };
}
