import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BSKLedgerFilters {
  transferCategory?: string;
  transactionType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  referenceId?: string;
  search?: string;
  balanceType?: 'withdrawable' | 'holding' | null;
}

export interface BSKLedgerEntry {
  id: string;
  user_id: string;
  created_at: string;
  amount: number;
  balance_type: string;
  transaction_type: string;
  transaction_subtype: string;
  balance_after: number;
  description: string;
  sender_recipient: string | null;
  related_user_id: string | null;
  reference_id: string | null;
  metadata: Record<string, any> | null;
  notes: string | null;
  status: string;
  is_credit: boolean;
  from_user_id: string | null;
  to_user_id: string | null;
  transfer_category: string;
  created_by: string | null;
  // Joined profiles
  from_user?: {
    display_name: string;
    email: string;
    username: string;
    avatar_url: string;
  } | null;
  to_user?: {
    display_name: string;
    email: string;
    username: string;
    avatar_url: string;
  } | null;
}

export interface BSKLedgerStats {
  totalTransactions: number;
  totalCredits: number;
  totalDebits: number;
  netFlow: number;
  userTransfers: number;
  adminOperations: number;
  rewardsDistributed: number;
  pendingCount: number;
}

export function useAdminBSKLedger(
  filters: BSKLedgerFilters = {},
  page: number = 1,
  limit: number = 50
) {
  return useQuery({
    queryKey: ['admin-bsk-ledger', filters, page, limit],
    queryFn: async () => {
      let query = supabase
        .from('unified_bsk_transactions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.transferCategory && filters.transferCategory !== 'all') {
        query = query.eq('transfer_category', filters.transferCategory);
      }

      if (filters.transactionType && filters.transactionType !== 'all') {
        query = query.eq('transaction_subtype', filters.transactionType);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`);
      }

      if (filters.userId) {
        query = query.or(`user_id.eq.${filters.userId},from_user_id.eq.${filters.userId},to_user_id.eq.${filters.userId}`);
      }

      if (filters.referenceId) {
        query = query.ilike('reference_id', `%${filters.referenceId}%`);
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

      // Fetch user profiles for from_user_id and to_user_id
      const userIds = new Set<string>();
      data?.forEach((entry: any) => {
        if (entry.user_id) userIds.add(entry.user_id);
        if (entry.from_user_id) userIds.add(entry.from_user_id);
        if (entry.to_user_id) userIds.add(entry.to_user_id);
      });

      let profiles: Record<string, any> = {};
      if (userIds.size > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, email, username, avatar_url')
          .in('user_id', Array.from(userIds));
        
        profileData?.forEach((p: any) => {
          profiles[p.user_id] = p;
        });
      }

      const enrichedData = data?.map((entry: any) => ({
        ...entry,
        from_user: entry.from_user_id ? profiles[entry.from_user_id] : null,
        to_user: entry.to_user_id ? profiles[entry.to_user_id] : null,
        user_profile: entry.user_id ? profiles[entry.user_id] : null,
      }));

      return {
        entries: enrichedData || [],
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      };
    },
  });
}

export function useBSKLedgerStats(filters: BSKLedgerFilters = {}) {
  return useQuery({
    queryKey: ['bsk-ledger-stats', filters],
    queryFn: async () => {
      let query = supabase
        .from('unified_bsk_transactions')
        .select('amount, is_credit, transfer_category, status');

      // Apply same filters
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`);
      }
      if (filters.userId) {
        query = query.or(`user_id.eq.${filters.userId},from_user_id.eq.${filters.userId},to_user_id.eq.${filters.userId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const entries = data || [];
      
      const stats: BSKLedgerStats = {
        totalTransactions: entries.length,
        totalCredits: entries.filter(e => e.is_credit).reduce((sum, e) => sum + Number(e.amount), 0),
        totalDebits: entries.filter(e => !e.is_credit).reduce((sum, e) => sum + Number(e.amount), 0),
        netFlow: entries.reduce((sum, e) => sum + (e.is_credit ? Number(e.amount) : -Number(e.amount)), 0),
        userTransfers: entries.filter(e => e.transfer_category === 'user_to_user').length,
        adminOperations: entries.filter(e => 
          e.transfer_category === 'admin_to_user' || e.transfer_category === 'user_to_admin'
        ).length,
        rewardsDistributed: entries.filter(e => 
          e.transfer_category === 'reward' || e.transfer_category === 'referral_reward'
        ).reduce((sum, e) => sum + (e.is_credit ? Number(e.amount) : 0), 0),
        pendingCount: entries.filter(e => e.status === 'pending').length,
      };

      return stats;
    },
  });
}

export function exportBSKLedgerToCSV(entries: BSKLedgerEntry[]) {
  const headers = [
    'Transaction ID',
    'Reference ID',
    'Date & Time',
    'From User',
    'From Email',
    'To User', 
    'To Email',
    'Transfer Type',
    'Category',
    'Amount (BSK)',
    'Balance Type',
    'Status',
    'Description',
    'Notes',
  ];

  const rows = entries.map(e => [
    e.id,
    e.reference_id || 'N/A',
    new Date(e.created_at).toLocaleString(),
    e.from_user?.display_name || e.sender_recipient || 'System',
    e.from_user?.email || 'N/A',
    e.to_user?.display_name || 'N/A',
    e.to_user?.email || 'N/A',
    e.transaction_subtype,
    e.transfer_category,
    e.is_credit ? `+${Number(e.amount).toFixed(2)}` : `-${Number(e.amount).toFixed(2)}`,
    e.balance_type,
    e.status,
    e.description,
    e.notes || '',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bsk-ledger-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportBSKLedgerToExcel(entries: BSKLedgerEntry[]) {
  // For Excel, we use the same CSV format but with .xls extension
  // Modern Excel handles CSV files with .xls extension
  const headers = [
    'Transaction ID',
    'Reference ID',
    'Date & Time',
    'From User',
    'From Email',
    'To User', 
    'To Email',
    'Transfer Type',
    'Category',
    'Amount (BSK)',
    'Balance Type',
    'Status',
    'Description',
    'Notes',
  ];

  const rows = entries.map(e => [
    e.id,
    e.reference_id || 'N/A',
    new Date(e.created_at).toLocaleString(),
    e.from_user?.display_name || e.sender_recipient || 'System',
    e.from_user?.email || 'N/A',
    e.to_user?.display_name || 'N/A',
    e.to_user?.email || 'N/A',
    e.transaction_subtype,
    e.transfer_category,
    e.is_credit ? Number(e.amount).toFixed(2) : `-${Number(e.amount).toFixed(2)}`,
    e.balance_type,
    e.status,
    e.description,
    e.notes || '',
  ]);

  // Create HTML table for Excel compatibility
  let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">';
  html += '<head><meta charset="UTF-8"></head><body><table>';
  html += '<tr>' + headers.map(h => `<th style="background:#333;color:#fff;font-weight:bold">${h}</th>`).join('') + '</tr>';
  rows.forEach(row => {
    html += '<tr>' + row.map(cell => `<td>${String(cell).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('') + '</tr>';
  });
  html += '</table></body></html>';

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bsk-ledger-${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}
