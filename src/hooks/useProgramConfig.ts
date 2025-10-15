import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProgramConfig(programKey: string) {
  return useQuery({
    queryKey: ["program-config", programKey],
    queryFn: async () => {
      // Get the current published config for this program
      const { data: module, error: moduleError } = await supabase
        .from("program_modules")
        .select("id")
        .eq("key", programKey)
        .eq("status", "live")
        .single();

      if (moduleError) throw moduleError;
      if (!module) return null;

      // Get the current published config
      const { data: config, error: configError } = await supabase
        .from("program_configs")
        .select("config_json")
        .eq("module_id", module.id)
        .eq("is_current", true)
        .eq("status", "published")
        .single();

      if (configError && configError.code !== "PGRST116") throw configError;
      
      return config?.config_json || null;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
