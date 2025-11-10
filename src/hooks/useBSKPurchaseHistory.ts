import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BSKPurchaseRequest {
  id: string;
  user_id: string;
  email: string;
  purchase_amount: number;
  withdrawable_amount: number;
  holding_bonus_amount: number;
  total_received: number;
  payment_method: string;
  transaction_hash: string | null;
  utr_number: string | null;
  bscscan_link: string | null;
  screenshot_url: string | null;
  payer_name: string | null;
  payer_contact: string | null;
  admin_bep20_address: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  rejected_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useBSKPurchaseHistory = (userId?: string) => {
  return useQuery({
    queryKey: ['bsk-purchase-history', userId],
    queryFn: async () => {
      let query = supabase
        .from('bsk_manual_purchase_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('[BSK Purchase History] Error fetching history:', error);
        throw error;
      }
      
      return (data || []) as BSKPurchaseRequest[];
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useBSKPurchaseStats = (userId?: string) => {
  return useQuery({
    queryKey: ['bsk-purchase-stats', userId],
    queryFn: async () => {
      let query = supabase
        .from('bsk_manual_purchase_requests')
        .select('status, purchase_amount, total_received');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const requests = data || [];
      
      return {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        totalPurchased: requests
          .filter(r => r.status === 'approved')
          .reduce((sum, r) => sum + (r.purchase_amount || 0), 0),
        totalReceived: requests
          .filter(r => r.status === 'approved')
          .reduce((sum, r) => sum + (r.total_received || 0), 0),
      };
    },
    staleTime: 60000, // 1 minute
  });
};
