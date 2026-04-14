import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const FUNCTION_NAME = 'admin-bsk-forensic-audit';

async function fetchSection(section: string, params: Record<string, string> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const searchParams = new URLSearchParams({ section, ...params });
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: null,
    headers: { 'Content-Type': 'application/json' },
    method: 'GET',
  });

  // Use fetch directly since functions.invoke doesn't support GET params well
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/${FUNCTION_NAME}?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export function useBSKForensicSummary() {
  return useQuery({
    queryKey: ['bsk-forensic-summary'],
    queryFn: () => fetchSection('summary'),
    staleTime: 60_000,
  });
}

export function useBSKSourceBreakdown() {
  return useQuery({
    queryKey: ['bsk-forensic-source-breakdown'],
    queryFn: () => fetchSection('source_breakdown'),
    staleTime: 60_000,
  });
}

export function useBSKTopHolders(limit = 50) {
  return useQuery({
    queryKey: ['bsk-forensic-top-holders', limit],
    queryFn: () => fetchSection('top_holders', { limit: String(limit) }),
    staleTime: 60_000,
  });
}

export function useBSKUserBalances(page: number, pageSize: number, search: string, balanceFilter: string, sortBy: string) {
  return useQuery({
    queryKey: ['bsk-forensic-users', page, pageSize, search, balanceFilter, sortBy],
    queryFn: () => fetchSection('users', {
      page: String(page),
      page_size: String(pageSize),
      search,
      balance_filter: balanceFilter,
      sort_by: sortBy,
    }),
    staleTime: 30_000,
  });
}

export function useBSKMismatches(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['bsk-forensic-mismatches', page, pageSize],
    queryFn: () => fetchSection('mismatches', {
      page: String(page),
      page_size: String(pageSize),
    }),
    staleTime: 60_000,
  });
}

export function useBSKUserDetail(userId: string | null) {
  return useQuery({
    queryKey: ['bsk-forensic-user-detail', userId],
    queryFn: () => fetchSection('user_detail', { user_id: userId! }),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useBSKUserHistory(userId: string | null, page: number, pageSize: number, sourceFilter: string) {
  return useQuery({
    queryKey: ['bsk-forensic-user-history', userId, page, pageSize, sourceFilter],
    queryFn: () => fetchSection('user_history', {
      user_id: userId!,
      page: String(page),
      page_size: String(pageSize),
      source_filter: sourceFilter,
    }),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useBSKExport() {
  const { toast } = useToast();

  const exportCSV = useCallback(async (balanceFilter = 'all', search = '') => {
    try {
      toast({ title: 'Generating export...' });
      const data = await fetchSection('export', { balance_filter: balanceFilter, search });
      
      if (!Array.isArray(data) || data.length === 0) {
        toast({ title: 'No data to export', variant: 'destructive' });
        return;
      }

      const headers = ['User ID', 'Username', 'Full Name', 'Email', 'Tradable BSK Balance', 'Total Earned', 'Created At'];
      const rows = data.map((r: any) => [
        r.user_id, r.username, r.full_name, r.email,
        r.balance, r.total_earned, r.created_at,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((r: any[]) => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tradable-bsk-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Export downloaded!' });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    }
  }, [toast]);

  return { exportCSV };
}
