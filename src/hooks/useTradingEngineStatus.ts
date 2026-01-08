import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TradingEngineStatus {
  autoMatchingEnabled: boolean;
  circuitBreakerActive: boolean;
  isHalted: boolean;
}

export function useTradingEngineStatus() {
  return useQuery({
    queryKey: ["trading-engine-status"],
    queryFn: async (): Promise<TradingEngineStatus> => {
      const { data, error } = await supabase
        .from("trading_engine_settings")
        .select("auto_matching_enabled, circuit_breaker_active")
        .single();

      if (error) {
        console.error("Failed to fetch trading engine status:", error);
        // Default to halted if we can't determine status
        return {
          autoMatchingEnabled: false,
          circuitBreakerActive: true,
          isHalted: true,
        };
      }

      const circuitBreakerActive = data?.circuit_breaker_active ?? false;
      const autoMatchingEnabled = data?.auto_matching_enabled ?? true;

      return {
        autoMatchingEnabled,
        circuitBreakerActive,
        isHalted: circuitBreakerActive || !autoMatchingEnabled,
      };
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000,
  });
}
