import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CustodialWithdrawal {
  id: string;
  user_id: string;
  asset_id: string;
  amount: number;
  to_address: string;
  status: string;
  tx_hash: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  asset?: {
    symbol: string;
    name: string;
  };
  profile?: {
    email: string;
    full_name: string;
  };
}

export function useCustodialWithdrawals(status?: string) {
  return useQuery({
    queryKey: ['admin-custodial-withdrawals', status],
    queryFn: async () => {
      let query = supabase
        .from('custodial_withdrawals')
        .select(`
          id,
          user_id,
          asset_id,
          amount,
          to_address,
          status,
          tx_hash,
          error_message,
          created_at,
          processed_at,
          asset:asset_id(symbol, name)
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for each withdrawal
      const withdrawalsWithProfiles = await Promise.all(
        (data || []).map(async (w: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('user_id', w.user_id)
            .maybeSingle();

          return {
            ...w,
            profile,
          } as CustodialWithdrawal;
        })
      );

      return withdrawalsWithProfiles;
    },
  });
}

export function useProcessCustodialWithdrawal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ withdrawalId }: { withdrawalId: string }) => {
      const { data, error } = await supabase.functions.invoke('process-custodial-withdrawal', {
        body: { withdrawal_id: withdrawalId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Processing failed');
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-custodial-withdrawals'] });
      toast({
        title: "Success",
        description: "Withdrawal processed successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
