import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommissionRate {
  id: string;
  level: number;
  commission_percent: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export function useReferralManagement() {
  const queryClient = useQueryClient();

  const { data: commissionRates, isLoading } = useQuery({
    queryKey: ['commission-rates'],
    queryFn: async () => {
      return [] as CommissionRate[];
    }
  });

  const { data: referralStats } = useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      return {
        totalCommissions: 0,
        uniqueReferrers: 0,
        recentCommissions: []
      };
    }
  });

  const updateCommissionRate = useMutation({
    mutationFn: async ({ level, commission_percent }: { level: number; commission_percent: number }) => {
      return {};
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rates'] });
      toast.success('Commission rate updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update rate: ${error.message}`);
    }
  });

  return {
    commissionRates: commissionRates || [],
    referralStats,
    isLoading,
    updateCommissionRate: updateCommissionRate.mutate
  };
}