import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface UnifiedBSKTransaction {
  id: string;
  user_id: string;
  created_at: string;
  amount: number;  // Changed from amount_bsk to match view
  transaction_type: string;
  balance_type: 'withdrawable' | 'holding';
  description: string;
  metadata?: {
    transaction_ref?: string;
    recipient_id?: string;
    sender_id?: string;
    status?: string;
    withdrawal_type?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
    account_holder_name?: string;
    crypto_symbol?: string;
    crypto_address?: string;
    crypto_network?: string;
    loan_id?: string;
    installment_id?: string;
    notes?: string;
    admin_notes?: string;
    [key: string]: any;
  };
  balance_after?: number;
}

export interface FilterOptions {
  dateFrom?: string;
  dateTo?: string;
  transactionTypes?: string[];
  balanceTypes?: ('withdrawable' | 'holding')[];
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
}

export interface TransactionStatistics {
  totalEarned: number;
  totalSpent: number;
  netChange: number;
  withdrawableTotal: number;
  holdingTotal: number;
  byTransactionType: Record<string, number>;
}

export const useUnifiedBSKHistory = (userId?: string, initialFilters?: FilterOptions) => {
  const [filters, setFilters] = useState<FilterOptions>(initialFilters || {});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Fetch transactions
  const { data: transactionsData, isLoading, error, refetch } = useQuery({
    queryKey: ['unified-bsk-history', userId, filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('unified_bsk_transactions')
        .select('*', { count: 'exact' });

      // Filter by user if provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Apply date filters
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      // Apply transaction type filter
      if (filters.transactionTypes && filters.transactionTypes.length > 0) {
        query = query.in('transaction_type', filters.transactionTypes);
      }

      // Apply balance type filter
      if (filters.balanceTypes && filters.balanceTypes.length > 0) {
        query = query.in('balance_type', filters.balanceTypes);
      }

      // Apply amount range filters
      if (filters.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }

      // Apply search term (search in description)
      if (filters.searchTerm) {
        query = query.ilike('description', `%${filters.searchTerm}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      // Order by date descending
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        transactions: data as UnifiedBSKTransaction[],
        totalCount: count || 0,
      };
    },
    enabled: true,
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['unified-bsk-statistics', userId, filters],
    queryFn: async () => {
      let query = supabase
        .from('unified_bsk_transactions')
        .select('amount, transaction_type, balance_type');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      // Apply same filters as main query (except pagination)
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.transactionTypes && filters.transactionTypes.length > 0) {
        query = query.in('transaction_type', filters.transactionTypes);
      }
      if (filters.balanceTypes && filters.balanceTypes.length > 0) {
        query = query.in('balance_type', filters.balanceTypes);
      }
      if (filters.minAmount !== undefined) {
        query = query.gte('amount', filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        query = query.lte('amount', filters.maxAmount);
      }
      if (filters.searchTerm) {
        query = query.ilike('description', `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const transactions = data as UnifiedBSKTransaction[];

      // Calculate statistics
      const stats: TransactionStatistics = {
        totalEarned: 0,
        totalSpent: 0,
        netChange: 0,
        withdrawableTotal: 0,
        holdingTotal: 0,
        byTransactionType: {},
      };

      transactions.forEach((tx) => {
        const amount = tx.amount;

        // Total earned/spent
        if (amount > 0) {
          stats.totalEarned += amount;
        } else {
          stats.totalSpent += Math.abs(amount);
        }

        // Net change
        stats.netChange += amount;

        // By balance type
        if (tx.balance_type === 'withdrawable') {
          stats.withdrawableTotal += amount;
        } else {
          stats.holdingTotal += amount;
        }

        // By transaction type
        if (!stats.byTransactionType[tx.transaction_type]) {
          stats.byTransactionType[tx.transaction_type] = 0;
        }
        stats.byTransactionType[tx.transaction_type] += amount;
      });

      return stats;
    },
    enabled: true,
  });

  // Export to CSV
  const exportToCSV = () => {
    if (!transactionsData?.transactions) return;

    const headers = [
      'Date',
      'Type',
      'Subtype',
      'Amount BSK',
      'Balance Type',
      'Description',
      'Balance Before',
      'Balance After',
      'Source',
    ];

    const rows = transactionsData.transactions.map((tx) => [
      new Date(tx.created_at).toLocaleString(),
      tx.transaction_type,
      '',
      tx.amount.toString(),
      tx.balance_type,
      tx.description,
      '',
      tx.balance_after?.toString() || '',
      '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsk-transactions-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return {
    transactions: transactionsData?.transactions || [],
    totalCount: transactionsData?.totalCount || 0,
    statistics,
    isLoading,
    error,
    filters,
    setFilters,
    page,
    setPage,
    pageSize,
    totalPages: Math.ceil((transactionsData?.totalCount || 0) / pageSize),
    refetch,
    exportToCSV,
  };
};
