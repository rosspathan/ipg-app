import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface InsurancePlan {
  id: string;
  plan_name: string;
  plan_type: string;
  monthly_premium_bsk: number;
  max_coverage_bsk: number;
  coverage_ratio: number;
  min_age: number;
  max_age: number;
  is_active: boolean;
  created_at: string;
}

export interface InsuranceClaim {
  id: string;
  policy_id: string;
  claim_amount_bsk: number;
  claim_reason: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_documents: any;
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
}

export function useInsuranceManagement() {
  const queryClient = useQueryClient();

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['insurance-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_bsk_plans')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: claims } = useQuery({
    queryKey: ['insurance-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_bsk_claims')
        .select(`
          *,
          policy:insurance_bsk_policies!inner(
            *,
            plan:insurance_bsk_plans(*),
            user:profiles(username, display_name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const { data: policies } = useQuery({
    queryKey: ['insurance-policies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_bsk_policies')
        .select(`
          *,
          plan:insurance_bsk_plans(*),
          user:profiles(username, display_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createPlan = useMutation({
    mutationFn: async (newPlan: any) => {
      const { data, error } = await supabase
        .from('insurance_bsk_plans')
        .insert([{ ...newPlan, is_active: true }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-plans'] });
      toast.success('Insurance plan created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create plan: ${error.message}`);
    }
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InsurancePlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('insurance_bsk_plans')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-plans'] });
      toast.success('Plan updated successfully');
    }
  });

  const reviewClaim = useMutation({
    mutationFn: async ({ 
      claimId, 
      status, 
      adminNotes, 
      approvedAmount 
    }: { 
      claimId: string; 
      status: 'approved' | 'rejected'; 
      adminNotes?: string;
      approvedAmount?: number;
    }) => {
      const updates: any = {
        status,
        admin_notes: adminNotes,
        decided_at: new Date().toISOString(),
        decided_by: (await supabase.auth.getUser()).data.user?.id
      };

      if (status === 'approved' && approvedAmount !== undefined) {
        updates.approved_amount_bsk = approvedAmount;
      }

      const { error } = await supabase
        .from('insurance_bsk_claims')
        .update(updates)
        .eq('id', claimId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast.success('Claim reviewed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to review claim: ${error.message}`);
    }
  });

  return {
    plans: plans || [],
    claims: claims || [],
    policies: policies || [],
    isLoading: plansLoading,
    createPlan: createPlan.mutate,
    updatePlan: updatePlan.mutate,
    reviewClaim: reviewClaim.mutate
  };
}
