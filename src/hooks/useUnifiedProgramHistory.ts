import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ProgramParticipation {
  id: string;
  user_id: string;
  module_id: string;
  participation_type: string;
  input_data?: any;
  output_data?: any;
  amount_paid?: number;
  amount_earned?: number;
  outcome?: string;
  rewards?: any;
  created_at: string;
  completed_at?: string;
  program_modules?: {
    name: string;
    icon?: string;
    category?: string;
  };
}

export interface ProgramFilterOptions {
  dateFrom?: string;
  dateTo?: string;
  programTypes?: string[];
  outcomes?: string[];
  searchTerm?: string;
}

export interface ProgramStatistics {
  totalParticipations: number;
  totalEarned: number;
  totalPaid: number;
  activeCount: number;
  completedCount: number;
  byProgramType: Record<string, number>;
}

export const useUnifiedProgramHistory = (userId?: string, initialFilters?: ProgramFilterOptions) => {
  const [filters, setFilters] = useState<ProgramFilterOptions>(initialFilters || {});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Fetch program participations
  const { data: participationsData, isLoading, error, refetch } = useQuery({
    queryKey: ['unified-program-history', userId, filters, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('user_program_participations')
        .select(`
          *,
          program_modules (
            name,
            icon,
            category
          )
        `, { count: 'exact' });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.programTypes && filters.programTypes.length > 0) {
        query = query.in('participation_type', filters.programTypes);
      }

      if (filters.outcomes && filters.outcomes.length > 0) {
        query = query.in('outcome', filters.outcomes);
      }

      if (filters.searchTerm) {
        query = query.ilike('participation_type', `%${filters.searchTerm}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        participations: data as ProgramParticipation[],
        totalCount: count || 0,
      };
    },
    enabled: true,
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['program-statistics', userId, filters],
    queryFn: async () => {
      let query = supabase
        .from('user_program_participations')
        .select('amount_earned, amount_paid, participation_type, outcome, completed_at');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.programTypes && filters.programTypes.length > 0) {
        query = query.in('participation_type', filters.programTypes);
      }
      if (filters.outcomes && filters.outcomes.length > 0) {
        query = query.in('outcome', filters.outcomes);
      }
      if (filters.searchTerm) {
        query = query.ilike('participation_type', `%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const participations = data as ProgramParticipation[];

      const stats: ProgramStatistics = {
        totalParticipations: participations.length,
        totalEarned: 0,
        totalPaid: 0,
        activeCount: 0,
        completedCount: 0,
        byProgramType: {},
      };

      participations.forEach((p) => {
        stats.totalEarned += p.amount_earned || 0;
        stats.totalPaid += p.amount_paid || 0;

        if (p.completed_at) {
          stats.completedCount++;
        } else {
          stats.activeCount++;
        }

        if (!stats.byProgramType[p.participation_type]) {
          stats.byProgramType[p.participation_type] = 0;
        }
        stats.byProgramType[p.participation_type]++;
      });

      return stats;
    },
    enabled: true,
  });

  // Export to CSV
  const exportToCSV = () => {
    if (!participationsData?.participations) return;

    const headers = [
      'Date',
      'Program',
      'Type',
      'Amount Earned',
      'Amount Paid',
      'Outcome',
      'Status',
    ];

    const rows = participationsData.participations.map((p) => [
      new Date(p.created_at).toLocaleString(),
      p.program_modules?.name || p.module_id,
      p.participation_type,
      p.amount_earned?.toString() || '0',
      p.amount_paid?.toString() || '0',
      p.outcome || 'N/A',
      p.completed_at ? 'Completed' : 'Active',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `program-participations-${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return {
    participations: participationsData?.participations || [],
    totalCount: participationsData?.totalCount || 0,
    statistics,
    isLoading,
    error,
    filters,
    setFilters,
    page,
    setPage,
    pageSize,
    totalPages: Math.ceil((participationsData?.totalCount || 0) / pageSize),
    refetch,
    exportToCSV,
  };
};
