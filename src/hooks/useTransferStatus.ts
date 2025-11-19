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

      if (error) throw error;
      return data?.value === "true";
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
