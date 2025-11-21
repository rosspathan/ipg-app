import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OfferPurchaseClaim {
  id: string;
  user_id: string;
  bonus_id: string;
  purchase_amount_bsk: number;
  withdrawable_bonus_bsk: number;
  holding_bonus_bsk: number;
  order_id: string;
  claimed_at: string;
  // Joined data
  user_full_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  campaign_name: string;
  offer_description: string | null;
  withdrawable_bonus_percent: number;
  holding_bonus_percent: number;
}

export interface PurchaseHistoryFilters {
  startDate?: string;
  endDate?: string;
  bonusId?: string;
  search?: string;
  bonusType?: 'withdrawable' | 'holding' | 'all';
}

export const useAdminOfferPurchaseHistory = (
  filters: PurchaseHistoryFilters,
  page: number = 1,
  limit: number = 50
) => {
  return useQuery({
    queryKey: ['admin-offer-purchase-history', filters, page, limit],
    queryFn: async () => {
      let query = supabase
        .from('user_purchase_bonus_claims')
        .select(`
          id,
          user_id,
          bonus_id,
          purchase_amount_bsk,
          withdrawable_bonus_bsk,
          holding_bonus_bsk,
          order_id,
          claimed_at,
          profiles!inner(full_name, email, phone),
          bsk_purchase_bonuses!inner(
            campaign_name,
            description,
            withdrawable_bonus_percent,
            holding_bonus_percent
          )
        `, { count: 'exact' })
        .order('claimed_at', { ascending: false });

      // Date range filter
      if (filters.startDate) {
        query = query.gte('claimed_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('claimed_at', filters.endDate);
      }

      // Offer filter
      if (filters.bonusId) {
        query = query.eq('bonus_id', filters.bonusId);
      }

      // Bonus type filter
      if (filters.bonusType === 'withdrawable') {
        query = query.gt('withdrawable_bonus_bsk', 0);
      } else if (filters.bonusType === 'holding') {
        query = query.gt('holding_bonus_bsk', 0);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data to flat structure
      const claims: OfferPurchaseClaim[] = (data || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        bonus_id: item.bonus_id,
        purchase_amount_bsk: item.purchase_amount_bsk,
        withdrawable_bonus_bsk: item.withdrawable_bonus_bsk,
        holding_bonus_bsk: item.holding_bonus_bsk,
        order_id: item.order_id,
        claimed_at: item.claimed_at,
        user_full_name: item.profiles?.full_name || null,
        user_email: item.profiles?.email || null,
        user_phone: item.profiles?.phone || null,
        campaign_name: item.bsk_purchase_bonuses?.campaign_name || 'Unknown',
        offer_description: item.bsk_purchase_bonuses?.description || null,
        withdrawable_bonus_percent: item.bsk_purchase_bonuses?.withdrawable_bonus_percent || 0,
        holding_bonus_percent: item.bsk_purchase_bonuses?.holding_bonus_percent || 0,
      }));

      // Filter by search term if provided
      let filteredClaims = claims;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredClaims = claims.filter(claim => 
          claim.user_email?.toLowerCase().includes(searchLower) ||
          claim.user_full_name?.toLowerCase().includes(searchLower) ||
          claim.user_phone?.includes(searchLower) ||
          claim.order_id.toLowerCase().includes(searchLower)
        );
      }

      return {
        claims: filteredClaims,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
  });
};

export const useOfferPurchaseAnalytics = (filters: PurchaseHistoryFilters) => {
  return useQuery({
    queryKey: ['offer-purchase-analytics', filters],
    queryFn: async () => {
      let query = supabase
        .from('user_purchase_bonus_claims')
        .select(`
          purchase_amount_bsk,
          withdrawable_bonus_bsk,
          holding_bonus_bsk,
          user_id
        `);

      if (filters.startDate) {
        query = query.gte('claimed_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('claimed_at', filters.endDate);
      }
      if (filters.bonusId) {
        query = query.eq('bonus_id', filters.bonusId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const totalClaims = data?.length || 0;
      const totalPurchaseVolume = data?.reduce((sum, claim) => sum + claim.purchase_amount_bsk, 0) || 0;
      const totalWithdrawableBonus = data?.reduce((sum, claim) => sum + claim.withdrawable_bonus_bsk, 0) || 0;
      const totalHoldingBonus = data?.reduce((sum, claim) => sum + claim.holding_bonus_bsk, 0) || 0;
      const uniqueUsers = new Set(data?.map(claim => claim.user_id)).size;

      return {
        totalClaims,
        totalPurchaseVolume,
        totalBonusesDistributed: totalWithdrawableBonus + totalHoldingBonus,
        totalWithdrawableBonus,
        totalHoldingBonus,
        uniqueUsers,
      };
    },
  });
};

export const exportPurchaseHistoryToCSV = (claims: OfferPurchaseClaim[]) => {
  const headers = [
    'Date',
    'Time',
    'User ID',
    'User Name',
    'User Email',
    'User Phone',
    'Offer Campaign',
    'Offer Description',
    'Purchase Amount (BSK)',
    'Withdrawable Bonus (BSK)',
    'Withdrawable %',
    'Holding Bonus (BSK)',
    'Holding %',
    'Total Bonus (BSK)',
    'Order ID'
  ];

  const rows = claims.map(claim => {
    const date = new Date(claim.claimed_at);
    const totalBonus = claim.withdrawable_bonus_bsk + claim.holding_bonus_bsk;
    
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      claim.user_id,
      claim.user_full_name || 'N/A',
      claim.user_email || 'N/A',
      claim.user_phone || 'N/A',
      claim.campaign_name,
      claim.offer_description || 'N/A',
      claim.purchase_amount_bsk.toFixed(2),
      claim.withdrawable_bonus_bsk.toFixed(2),
      `${claim.withdrawable_bonus_percent}%`,
      claim.holding_bonus_bsk.toFixed(2),
      `${claim.holding_bonus_percent}%`,
      totalBonus.toFixed(2),
      claim.order_id
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `bsk-offer-purchases-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
