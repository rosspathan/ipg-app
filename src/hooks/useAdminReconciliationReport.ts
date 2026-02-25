import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserTransferDetail {
  id: string;
  user_id: string;
  email: string;
  username: string;
  direction: string; // 'to_trading' | 'to_wallet'
  asset_symbol: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: string;
  tx_hash: string | null;
  reference_id: string | null;
  balance_after: number | null;
  created_at: string;
  notes: string | null;
}

export interface UserAuditRow {
  user_id: string;
  email: string;
  username: string;
  asset_symbol: string;
  available: number;
  locked: number;
  total: number;
  ledger_net: number;
  drift: number;
}

export interface HotWalletFlow {
  asset_symbol: string;
  total_deposits: number;
  deposit_count: number;
  total_withdrawals: number;
  withdrawal_count: number;
  total_internal_in: number;
  internal_in_count: number;
  total_internal_out: number;
  internal_out_count: number;
  total_fees_collected: number;
  net_balance: number;
}

// Batched profile fetcher to avoid URL length limits
async function fetchProfilesBatched(userIds: string[]): Promise<Record<string, { email: string; username: string }>> {
  const map: Record<string, { email: string; username: string }> = {};
  const batchSize = 80;
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, email, username')
      .in('user_id', batch);
    (data || []).forEach(p => {
      map[p.user_id] = { email: p.email || 'N/A', username: p.username || p.user_id.substring(0, 8) };
    });
  }
  return map;
}

export function useTransferHistory() {
  return useQuery({
    queryKey: ['admin-recon-transfer-history'],
    queryFn: async (): Promise<UserTransferDetail[]> => {
      // Fetch all internal balance transfers
      const { data: transfers, error } = await supabase
        .from('internal_balance_transfers')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      if (!transfers?.length) return [];

      const userIds = [...new Set(transfers.map(t => t.user_id))];
      const profileMap = await fetchProfilesBatched(userIds);

      return transfers.map(t => ({
        id: t.id,
        user_id: t.user_id,
        email: profileMap[t.user_id]?.email || 'N/A',
        username: profileMap[t.user_id]?.username || t.user_id.substring(0, 8),
        direction: t.direction,
        asset_symbol: t.asset_symbol,
        amount: Number(t.amount || 0),
        fee: Number(t.fee || 0),
        net_amount: Number(t.net_amount || 0),
        status: t.status,
        tx_hash: t.tx_hash,
        reference_id: t.reference_id,
        balance_after: t.balance_after != null ? Number(t.balance_after) : null,
        created_at: t.created_at,
        notes: t.notes,
      }));
    },
    staleTime: 30000,
  });
}

export function useUserAuditWithEmail(assetSymbol?: string) {
  return useQuery({
    queryKey: ['admin-recon-user-audit-email', assetSymbol],
    queryFn: async (): Promise<UserAuditRow[]> => {
      let balanceQuery = supabase
        .from('wallet_balances')
        .select('user_id, available, locked, asset_id, assets!inner(symbol)')
        .neq('user_id', '00000000-0000-0000-0000-000000000001');

      if (assetSymbol) {
        balanceQuery = balanceQuery.eq('assets.symbol', assetSymbol);
      }

      const { data: balances } = await balanceQuery;
      if (!balances?.length) return [];

      // Get ledger sums
      const { data: ledgerSums } = await supabase.rpc('get_user_ledger_summary' as any);

      const userIds = [...new Set(balances.map(b => b.user_id))];
      const profileMap = await fetchProfilesBatched(userIds);

      const ledgerMap: Record<string, any> = {};
      (ledgerSums as any[] || []).forEach((l: any) => {
        ledgerMap[`${l.user_id}:${l.asset_symbol}`] = l;
      });

      return balances.map(b => {
        const sym = (b.assets as any)?.symbol || '';
        const ledger = ledgerMap[`${b.user_id}:${sym}`] || {};
        const available = Number(b.available || 0);
        const locked = Number(b.locked || 0);
        const total = available + locked;
        const ledgerNet = Number(ledger.net_delta || 0);

        return {
          user_id: b.user_id,
          email: profileMap[b.user_id]?.email || 'N/A',
          username: profileMap[b.user_id]?.username || b.user_id.substring(0, 8),
          asset_symbol: sym,
          available,
          locked,
          total,
          ledger_net: ledgerNet,
          drift: Math.abs(total - ledgerNet) > 0.00001 ? total - ledgerNet : 0,
        };
      }).filter(u => u.total > 0.00001 || Math.abs(u.drift) > 0.00001)
        .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));
    },
    staleTime: 30000,
  });
}

export function useHotWalletTransparency() {
  return useQuery({
    queryKey: ['admin-recon-hotwallet-transparency'],
    queryFn: async (): Promise<{ flows: HotWalletFlow[]; address: string | null }> => {
      // Hot wallet address
      const { data: wallet } = await supabase
        .from('platform_hot_wallet')
        .select('address')
        .eq('is_active', true)
        .eq('label', 'Trading Hot Wallet')
        .maybeSingle();

      // Custodial deposits (inflows)
      const { data: deposits } = await supabase
        .from('custodial_deposits')
        .select('asset_id, amount, status, assets!inner(symbol)')
        .eq('status', 'credited');

      // Withdrawals (outflows)
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('asset_id, amount, fee, status, assets!inner(symbol)')
        .in('status', ['completed', 'processing']);

      // Custodial withdrawals (outflows)
      const { data: custWithdrawals } = await supabase
        .from('custodial_withdrawals')
        .select('asset_id, amount, fee_amount, status, assets!inner(symbol)')
        .in('status', ['completed', 'processing', 'sent']);

      // Internal transfers
      const { data: internals } = await supabase
        .from('internal_balance_transfers')
        .select('asset_symbol, amount, fee, direction, status')
        .eq('status', 'completed');

      const flowMap: Record<string, HotWalletFlow> = {};
      const getOrCreate = (sym: string): HotWalletFlow => {
        if (!flowMap[sym]) {
          flowMap[sym] = {
            asset_symbol: sym,
            total_deposits: 0, deposit_count: 0,
            total_withdrawals: 0, withdrawal_count: 0,
            total_internal_in: 0, internal_in_count: 0,
            total_internal_out: 0, internal_out_count: 0,
            total_fees_collected: 0, net_balance: 0,
          };
        }
        return flowMap[sym];
      };

      (deposits || []).forEach(d => {
        const sym = (d.assets as any)?.symbol;
        if (sym) {
          const f = getOrCreate(sym);
          f.total_deposits += Number(d.amount || 0);
          f.deposit_count++;
        }
      });

      (withdrawals || []).forEach(w => {
        const sym = (w.assets as any)?.symbol;
        if (sym) {
          const f = getOrCreate(sym);
          f.total_withdrawals += Number(w.amount || 0);
          f.withdrawal_count++;
          f.total_fees_collected += Number(w.fee || 0);
        }
      });

      (custWithdrawals || []).forEach(w => {
        const sym = (w.assets as any)?.symbol;
        if (sym) {
          const f = getOrCreate(sym);
          f.total_withdrawals += Number(w.amount || 0);
          f.withdrawal_count++;
          f.total_fees_collected += Number(w.fee_amount || 0);
        }
      });

      (internals || []).forEach(t => {
        if (!t.asset_symbol) return;
        const f = getOrCreate(t.asset_symbol);
        if (t.direction === 'to_trading') {
          f.total_internal_in += Number(t.amount || 0);
          f.internal_in_count++;
        } else {
          f.total_internal_out += Number(t.amount || 0);
          f.internal_out_count++;
        }
        f.total_fees_collected += Number(t.fee || 0);
      });

      Object.values(flowMap).forEach(f => {
        f.net_balance = (f.total_deposits + f.total_internal_in) - (f.total_withdrawals + f.total_internal_out);
      });

      return {
        flows: Object.values(flowMap).sort((a, b) => b.net_balance - a.net_balance),
        address: wallet?.address || null,
      };
    },
    staleTime: 30000,
  });
}
