import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LoanConfig {
  id: string;
  min_loan_amount: number;
  max_loan_amount: number;
  interest_rate_percent: number;
  duration_weeks: number;
  processing_fee_percent: number;
  late_payment_fee: number;
  is_enabled: boolean;
  created_at: string;
}

export interface LoanApplication {
  id: string;
  user_id: string;
  requested_amount: number;
  loan_purpose: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
}

export function useLoanManagement() {
  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['loan-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loan_configs')
        .select('*')
        .eq('is_enabled', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
  });

  const { data: applications } = useQuery({
    queryKey: ['loan-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loan_applications')
        .select(`
          *,
          user:profiles(username, display_name, email),
          bsk_balance:user_bsk_balances(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: loans } = useQuery({
    queryKey: ['active-loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loans')
        .select(`
          *,
          user:profiles(username, display_name),
          installments:bsk_loan_installments(*)
        `)
        .in('status', ['active', 'overdue'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<LoanConfig>) => {
      const { data, error } = await supabase
        .from('bsk_loan_configs')
        .insert([{ ...updates, is_enabled: true }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-config'] });
      toast.success('Loan configuration updated');
    }
  });

  const reviewApplication = useMutation({
    mutationFn: async ({ 
      applicationId, 
      status, 
      adminNotes 
    }: { 
      applicationId: string; 
      status: 'approved' | 'rejected'; 
      adminNotes?: string;
    }) => {
      const { error } = await supabase
        .from('bsk_loan_applications')
        .update({
          status,
          admin_notes: adminNotes,
          decided_at: new Date().toISOString(),
          decided_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', applicationId);

      if (error) throw error;

      // Loan creation logic simplified for now
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
      queryClient.invalidateQueries({ queryKey: ['active-loans'] });
      toast.success('Application reviewed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to review application: ${error.message}`);
    }
  });

  return {
    config,
    applications: applications || [],
    loans: loans || [],
    updateConfig: updateConfig.mutate,
    reviewApplication: reviewApplication.mutate
  };
}
