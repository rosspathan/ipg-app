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
        console.error('[useTransferStatus] Error fetching transfer status (assuming enabled):', error);
        // IMPORTANT: Don't block transfers just because we can't read the setting
        // The backend edge function will still enforce the real status
        return true;
      }
      
      // If no data exists, assume enabled (our migrations seed this as 'true')
      if (!data) {
        console.log('[useTransferStatus] No setting found, assuming enabled');
        return true;
      }
      
      const isEnabled = data.value === "true";
      console.log('[useTransferStatus] Transfers explicitly set to:', isEnabled);
      return isEnabled;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });
}
