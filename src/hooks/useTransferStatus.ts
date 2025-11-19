import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useTransferStatus() {
  return useQuery({
    queryKey: ["bsk-transfer-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "bsk_transfers_enabled")
        .single();

      if (error) {
        console.error('[useTransferStatus] Error fetching transfer status:', error);
        throw error;
      }
      
      const isEnabled = data?.value === "true";
      console.log('[useTransferStatus] Transfers enabled:', isEnabled);
      return isEnabled;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });
}
