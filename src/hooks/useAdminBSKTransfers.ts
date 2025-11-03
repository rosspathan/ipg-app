import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TransferFilters {
  transferTypes?: string[];
  startDate?: string;
  endDate?: string;
  userId?: string;
  minAmount?: number;
  maxAmount?: number;
  balanceType?: 'withdrawable' | 'holding' | null;
  search?: string;
}

export interface TransferStats {
  totalTransfers: number;
  totalVolume: number;
  userTransfers: number;
  adminCredits: number;
  adminDebits: number;
  averageAmount: number;
  largestTransfer: {
    amount: number;
    fromUser?: string;
    toUser?: string;
  } | null;
}

export function useAdminBSKTransfers(
  filters: TransferFilters = {},
  page: number = 1,
  limit: number = 50
) {
  return useQuery({
    queryKey: ['admin-bsk-transfers', filters, page, limit],
    queryFn: async () => {
      let query = supabase
        .from('unified_bsk_transactions')
        .select(`
          *,
          sender:profiles!unified_bsk_transactions_user_id_fkey(
            id,
            display_name,
            email,
            username,
            avatar_url
          )
        `, { count: 'exact' })
        .in('transaction_type', ['transfer_in', 'transfer_out', 'admin_credit', 'admin_debit'])
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.transferTypes?.length) {
        query = query.in('transaction_type', filters.transferTypes);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }

      if (filters.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }

      if (filters.balanceType) {
        query = query.eq('balance_type', filters.balanceType);
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        transfers: data || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
  });
}

export function useTransferStats(filters: TransferFilters = {}) {
  return useQuery({
    queryKey: ['transfer-stats', filters],
    queryFn: async () => {
      let query = supabase
        .from('unified_bsk_transactions')
        .select('transaction_type, amount, user_id')
        .in('transaction_type', ['transfer_in', 'transfer_out', 'admin_credit', 'admin_debit']);

      // Apply same filters
      if (filters.transferTypes?.length) {
        query = query.in('transaction_type', filters.transferTypes);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const transfers = data || [];
      
      const stats: TransferStats = {
        totalTransfers: transfers.length,
        totalVolume: transfers.reduce((sum, t) => sum + Number(t.amount), 0),
        userTransfers: transfers.filter(t => 
          t.transaction_type === 'transfer_in' || t.transaction_type === 'transfer_out'
        ).length,
        adminCredits: transfers.filter(t => t.transaction_type === 'admin_credit').length,
        adminDebits: transfers.filter(t => t.transaction_type === 'admin_debit').length,
        averageAmount: transfers.length > 0 
          ? transfers.reduce((sum, t) => sum + Number(t.amount), 0) / transfers.length 
          : 0,
        largestTransfer: transfers.length > 0
          ? transfers.reduce((max, t) => Number(t.amount) > Number(max.amount) ? t : max)
          : null,
      };

      return stats;
    },
  });
}

export function exportTransfersToCSV(transfers: any[]) {
  const headers = [
    'Transaction ID',
    'Date & Time',
    'Transfer Type',
    'Sender Email',
    'Sender Username',
    'Amount (BSK)',
    'Balance Type',
    'Status',
    'Reference Number',
    'Notes',
  ];

  const rows = transfers.map(t => [
    t.id,
    new Date(t.created_at).toLocaleString(),
    t.transaction_type,
    t.sender?.email || 'N/A',
    t.sender?.username || 'N/A',
    Number(t.amount).toFixed(2),
    t.balance_type || 'N/A',
    t.status || 'completed',
    t.reference || 'N/A',
    t.notes || '',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bsk-transfers-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
