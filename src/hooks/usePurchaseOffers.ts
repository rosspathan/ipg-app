import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PurchaseOffer {
  id: string;
  campaign_name: string;
  description: string | null;
  purchase_amount_bsk?: number; // Deprecated, kept for backwards compatibility
  min_purchase_amount_bsk: number;
  max_purchase_amount_bsk: number;
  withdrawable_bonus_percent: number;
  holding_bonus_percent: number;
  start_at: string;
  end_at: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserClaim {
  id: string;
  user_id: string;
  bonus_id: string;
  claimed_at: string;
  purchase_amount_bsk: number;
  withdrawable_bonus_bsk: number;
  holding_bonus_bsk: number;
  order_id: string;
}

export const useActivePurchaseOffers = () => {
  return useQuery({
    queryKey: ['purchase-offers', 'active'],
    queryFn: async () => {
      // Auto-disable expired offers first
      await supabase.rpc('auto_disable_expired_offers');

      const { data, error } = await supabase
        .from('bsk_purchase_bonuses')
        .select('*')
        .eq('is_active', true)
        .lte('start_at', new Date().toISOString())
        .gte('end_at', new Date().toISOString())
        .order('is_featured', { ascending: false })
        .order('display_order', { ascending: true })
        .order('end_at', { ascending: true });

      if (error) throw error;
      return data as PurchaseOffer[];
    },
  });
};

export const useUserPurchaseClaims = () => {
  return useQuery({
    queryKey: ['user-purchase-claims'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_purchase_bonus_claims')
        .select(`
          *,
          bonus:bsk_purchase_bonuses(campaign_name, description)
        `)
        .eq('user_id', user.id)
        .order('claimed_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const usePurchaseOffer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ offerId, purchaseAmount }: { offerId: string; purchaseAmount: number }) => {
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { data, error } = await supabase.functions.invoke('purchase-one-time-offer', {
        body: { offer_id: offerId, order_id: orderId, purchase_amount_bsk: purchaseAmount },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.message || data.error);
      
      return data;
    },
    onSuccess: () => {
      toast.success('Purchase successful! Your bonuses have been credited.');
      queryClient.invalidateQueries({ queryKey: ['user-purchase-claims'] });
      queryClient.invalidateQueries({ queryKey: ['user_bsk_balances'] });
      queryClient.invalidateQueries({ queryKey: ['bsk-balance'] });
    },
    onError: (error: any) => {
      if (error.message.includes('ALREADY_CLAIMED')) {
        toast.error('You have already claimed this offer');
      } else if (error.message.includes('INSUFFICIENT_BALANCE')) {
        toast.error('Insufficient BSK balance');
      } else if (error.message.includes('OFFER_NOT_AVAILABLE')) {
        toast.error('This offer is no longer available');
      } else {
        toast.error(error.message || 'Purchase failed');
      }
    },
  });
};
