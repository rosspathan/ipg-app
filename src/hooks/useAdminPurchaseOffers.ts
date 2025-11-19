import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AdminPurchaseOffer {
  id: string;
  campaign_name: string;
  description: string | null;
  purchase_amount_bsk: number;
  withdrawable_bonus_percent: number;
  holding_bonus_percent: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CreateOfferInput {
  campaign_name: string;
  description?: string;
  purchase_amount_bsk: number;
  withdrawable_bonus_percent: number;
  holding_bonus_percent: number;
  start_at: string;
  end_at: string;
  is_featured?: boolean;
  display_order?: number;
}

export const useAdminPurchaseOffers = () => {
  return useQuery({
    queryKey: ['admin-purchase-offers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_purchase_bonuses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AdminPurchaseOffer[];
    },
  });
};

export const useCreatePurchaseOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOfferInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('bsk_purchase_bonuses')
        .insert({
          ...input,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Offer created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-offers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create offer');
    },
  });
};

export const useUpdatePurchaseOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateOfferInput> }) => {
      const { data, error } = await supabase
        .from('bsk_purchase_bonuses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Offer updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-offers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update offer');
    },
  });
};

export const useDeletePurchaseOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bsk_purchase_bonuses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Offer deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-offers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete offer');
    },
  });
};

export const useToggleOfferStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('bsk_purchase_bonuses')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.is_active ? 'Offer enabled' : 'Offer disabled');
      queryClient.invalidateQueries({ queryKey: ['admin-purchase-offers'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to toggle offer status');
    },
  });
};

export const useOfferAnalytics = (offerId: string) => {
  return useQuery({
    queryKey: ['offer-analytics', offerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_purchase_bonus_claims')
        .select('*')
        .eq('bonus_id', offerId);

      if (error) throw error;

      const totalClaims = data.length;
      const totalSpent = data.reduce((sum, claim) => sum + claim.purchase_amount_bsk, 0);
      const totalWithdrawableBonus = data.reduce((sum, claim) => sum + claim.withdrawable_bonus_bsk, 0);
      const totalHoldingBonus = data.reduce((sum, claim) => sum + claim.holding_bonus_bsk, 0);

      return {
        totalClaims,
        totalSpent,
        totalWithdrawableBonus,
        totalHoldingBonus,
        totalBonus: totalWithdrawableBonus + totalHoldingBonus,
        claims: data,
      };
    },
    enabled: !!offerId,
  });
};
