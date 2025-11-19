import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useAdminTransferControl() {
  const queryClient = useQueryClient();

  const { data: transfersEnabled, isLoading } = useQuery({
    queryKey: ["admin-transfer-control"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "bsk_transfers_enabled")
        .single();

      if (error) throw error;
      return data?.value === "true";
    },
  });

  const toggleTransfers = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value: enabled ? "true" : "false", updated_at: new Date().toISOString() })
        .eq("key", "bsk_transfers_enabled");

      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["admin-transfer-control"] });
      queryClient.invalidateQueries({ queryKey: ["bsk-transfer-status"] });
      toast.success(enabled ? "BSK transfers enabled" : "BSK transfers disabled");
    },
    onError: (error) => {
      toast.error("Failed to update transfer status");
      console.error("Transfer toggle error:", error);
    },
  });

  return {
    transfersEnabled,
    isLoading,
    toggleTransfers: toggleTransfers.mutate,
    isToggling: toggleTransfers.isPending,
  };
}
