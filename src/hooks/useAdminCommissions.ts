import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';

export interface CommissionRecord {
  id: string;
  earner_id: string;
  payer_id: string;
  level: number;
  commission_type: string;
  bsk_amount: number;
  destination: string;
  status: string;
  created_at: string;
  earner_username: string;
  earner_full_name: string;
  payer_username: string;
  payer_full_name: string;
  payer_badge: string;
}

export interface CommissionFilters {
  dateFrom?: Date;
  dateTo?: Date;
  commissionType?: string;
  earnerId?: string;
  payerId?: string;
  destination?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface CommissionStats {
  totalDistributed: number;
  totalThisMonth: number;
  activeEarners: number;
  avgCommission: number;
  byType: {
    direct: number;
    team_income: number;
    vip_milestone: number;
  };
}

export function useAdminCommissions(filters: CommissionFilters = {}, page: number = 1, pageSize: number = 50) {
  // Fetch commission records with pagination
  const commissionsQuery = useQuery({
    queryKey: ['admin-commissions', filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('referral_commissions')
        .select(`
          *,
          earner:profiles!referral_commissions_earner_id_fkey(username, full_name),
          payer:profiles!referral_commissions_payer_id_fkey(username, full_name),
          payer_badge:user_badge_holdings!referral_commissions_payer_id_fkey(current_badge)
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.dateFrom) {
        query = query.gte('created_at', startOfDay(filters.dateFrom).toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('created_at', endOfDay(filters.dateTo).toISOString());
      }
      if (filters.commissionType && filters.commissionType !== 'all') {
        query = query.eq('commission_type', filters.commissionType);
      }
      if (filters.earnerId) {
        query = query.eq('earner_id', filters.earnerId);
      }
      if (filters.payerId) {
        query = query.eq('payer_id', filters.payerId);
      }
      if (filters.destination && filters.destination !== 'all') {
        query = query.eq('destination', filters.destination);
      }
      if (filters.minAmount) {
        query = query.gte('bsk_amount', filters.minAmount);
      }
      if (filters.maxAmount) {
        query = query.lte('bsk_amount', filters.maxAmount);
      }

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform data
      const transformedData: CommissionRecord[] = (data || []).map((commission: any) => ({
        ...commission,
        earner_username: commission.earner?.username || 'Unknown',
        earner_full_name: commission.earner?.full_name || 'Unknown User',
        payer_username: commission.payer?.username || 'Unknown',
        payer_full_name: commission.payer?.full_name || 'Unknown User',
        payer_badge: commission.payer_badge?.current_badge || 'None',
      }));

      return {
        commissions: transformedData,
        total: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
  });

  // Fetch statistics
  const statsQuery = useQuery({
    queryKey: ['admin-commissions-stats', filters],
    queryFn: async () => {
      // Get all commissions matching filters (without pagination) for stats calculation
      let query = supabase
        .from('referral_commissions')
        .select('bsk_amount, commission_type, earner_id, created_at')
        .eq('status', 'settled');

      // Apply same filters as main query
      if (filters.dateFrom) {
        query = query.gte('created_at', startOfDay(filters.dateFrom).toISOString());
      }
      if (filters.dateTo) {
        query = query.lte('created_at', endOfDay(filters.dateTo).toISOString());
      }
      if (filters.commissionType && filters.commissionType !== 'all') {
        query = query.eq('commission_type', filters.commissionType);
      }
      if (filters.earnerId) {
        query = query.eq('earner_id', filters.earnerId);
      }
      if (filters.payerId) {
        query = query.eq('payer_id', filters.payerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculate statistics
      const totalDistributed = data?.reduce((sum, c) => sum + Number(c.bsk_amount), 0) || 0;
      
      // Calculate this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const totalThisMonth = data?.filter(c => new Date(c.created_at) >= startOfMonth)
        .reduce((sum, c) => sum + Number(c.bsk_amount), 0) || 0;

      // Count unique earners
      const uniqueEarners = new Set(data?.map(c => c.earner_id) || []);
      const activeEarners = uniqueEarners.size;

      // Average commission
      const avgCommission = data && data.length > 0 ? totalDistributed / data.length : 0;

      // Breakdown by type
      const byType = {
        direct: data?.filter(c => c.commission_type === 'direct')
          .reduce((sum, c) => sum + Number(c.bsk_amount), 0) || 0,
        team_income: data?.filter(c => c.commission_type === 'team_income')
          .reduce((sum, c) => sum + Number(c.bsk_amount), 0) || 0,
        vip_milestone: data?.filter(c => c.commission_type === 'vip_milestone')
          .reduce((sum, c) => sum + Number(c.bsk_amount), 0) || 0,
      };

      const stats: CommissionStats = {
        totalDistributed,
        totalThisMonth,
        activeEarners,
        avgCommission,
        byType,
      };

      return stats;
    },
  });

  return {
    commissions: commissionsQuery.data?.commissions || [],
    total: commissionsQuery.data?.total || 0,
    page: commissionsQuery.data?.page || 1,
    pageSize: commissionsQuery.data?.pageSize || pageSize,
    totalPages: commissionsQuery.data?.totalPages || 1,
    stats: statsQuery.data,
    isLoading: commissionsQuery.isLoading || statsQuery.isLoading,
    error: commissionsQuery.error || statsQuery.error,
    refetch: () => {
      commissionsQuery.refetch();
      statsQuery.refetch();
    },
  };
}
