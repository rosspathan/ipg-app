import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OutboundReconRow {
  withdrawal_id: string;
  tx_hash: string | null;
  token_symbol: string | null;
  token_name: string | null;
  amount: number;
  fee_amount: number | null;
  destination_address: string;
  user_id: string;
  user_email: string | null;
  user_full_name: string | null;
  username: string | null;
  withdrawal_status: string;
  requested_at: string;
  completed_at: string | null;
  onchain_record_id: string | null;
  onchain_amount: number | null;
  confirmations: number | null;
  block_number: number | null;
  confirmed_at: string | null;
  match_status: 'MATCHED' | 'UNMATCHED_ONCHAIN' | 'AMOUNT_MISMATCH' | 'ADDRESS_MISMATCH' | 'PENDING_BROADCAST' | 'NO_TX_HASH';
  mismatch_flag: boolean;
}

export interface InboundReconRow {
  onchain_record_id: string;
  tx_hash: string;
  token_symbol: string;
  amount: number;
  source_address: string;
  hot_wallet_address: string;
  user_id: string | null;
  user_email: string | null;
  username: string | null;
  status: string;
  confirmations: number;
  confirmed_at: string | null;
  created_at: string;
}

export interface AddressProfile {
  destination_address: string;
  distinct_user_count: number;
  completed_count: number;
  pending_count: number;
  total_amount_withdrawn: number;
  first_withdrawal_at: string;
  last_withdrawal_at: string;
  linked_user_ids: string[];
  tokens_used: string[] | null;
}

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  hot_wallet_address: string;
  tx_hash: string | null;
  token_symbol: string | null;
  amount: number | null;
  destination_address: string | null;
  related_user_id: string | null;
  related_withdrawal_id: string | null;
  message: string;
  metadata: Record<string, unknown>;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export interface OutboundFilters {
  token?: string;
  status?: string;
  matchStatus?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
}

export function useHotWalletOutboundRecon(filters: OutboundFilters = {}, limit = 200) {
  return useQuery({
    queryKey: ['hw-outbound-recon', filters, limit],
    queryFn: async () => {
      let q = supabase
        .from('v_hotwallet_outbound_reconciliation' as any)
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(limit);

      if (filters.token) q = q.eq('token_symbol', filters.token);
      if (filters.status) q = q.eq('withdrawal_status', filters.status);
      if (filters.matchStatus) q = q.eq('match_status', filters.matchStatus);
      if (filters.fromDate) q = q.gte('requested_at', filters.fromDate);
      if (filters.toDate) q = q.lte('requested_at', filters.toDate);
      if (filters.search) {
        const s = filters.search.trim().toLowerCase();
        q = q.or(`destination_address.ilike.%${s}%,tx_hash.ilike.%${s}%,user_email.ilike.%${s}%,username.ilike.%${s}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as OutboundReconRow[];
    },
    staleTime: 30_000,
  });
}

export function useHotWalletInboundRecon(limit = 100) {
  return useQuery({
    queryKey: ['hw-inbound-recon', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_hotwallet_inbound_reconciliation' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as InboundReconRow[];
    },
    staleTime: 30_000,
  });
}

export function useHotWalletAddressProfiles(limit = 50) {
  return useQuery({
    queryKey: ['hw-address-profiles', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_hotwallet_address_profiles' as any)
        .select('*')
        .order('total_amount_withdrawn', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as AddressProfile[];
    },
    staleTime: 60_000,
  });
}

export function useHotWalletSecurityAlerts(onlyUnacknowledged = false) {
  return useQuery({
    queryKey: ['hw-security-alerts', onlyUnacknowledged],
    queryFn: async () => {
      let q = supabase
        .from('hotwallet_security_alerts' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (onlyUnacknowledged) q = q.eq('acknowledged', false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SecurityAlert[];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('hotwallet_security_alerts' as any)
        .update({ acknowledged: true, acknowledged_by: user?.id, acknowledged_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hw-security-alerts'] });
      toast({ title: 'Alert acknowledged' });
    },
    onError: (e: Error) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });
}

export function useDailyProofReport(date: string) {
  return useQuery({
    queryKey: ['hw-daily-proof', date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('generate_hotwallet_daily_proof_report' as any, {
        p_date: date,
      });
      if (error) throw error;
      return data as {
        report_date: string;
        generated_at: string;
        hot_wallet_address: string;
        summary: {
          total_outbound_count: number;
          matched_count: number;
          unmatched_count: number;
          mismatch_count: number;
          pending_broadcast_count: number;
          distinct_destinations: number;
          distinct_users: number;
        };
        per_token: Array<{
          token_symbol: string;
          total_outbound_amount: number;
          total_outbound_count: number;
          matched_count: number;
          unmatched_count: number;
          mismatch_count: number;
        }>;
        top_destinations: Array<{ address: string; amount: number; tx_count: number; distinct_users: number }>;
        top_users: Array<{ user_id: string; email: string; username: string; amount: number; tx_count: number }>;
      };
    },
    staleTime: 5 * 60_000,
  });
}

export function useRunAlertScan() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('scan_hotwallet_security_alerts' as any);
      if (error) throw error;
      return data as { unmatched_alerts_created: number; threshold_breach_alerts_created: number; abnormal_repeat_alerts_created: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['hw-security-alerts'] });
      toast({
        title: 'Scan complete',
        description: `${data.unmatched_alerts_created} unmatched, ${data.threshold_breach_alerts_created} threshold, ${data.abnormal_repeat_alerts_created} repeat alerts`,
      });
    },
    onError: (e: Error) => toast({ title: 'Scan failed', description: e.message, variant: 'destructive' }),
  });
}
