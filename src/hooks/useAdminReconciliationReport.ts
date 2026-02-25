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
  // Detailed breakdown
  deposits: number;
  withdrawals: number;
  trade_buys: number;
  trade_sells: number;
  fees_paid: number;
  internal_in: number;
  internal_out: number;
  ledger_entries: number;
  active_orders: number;
  active_order_locked: number;
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

// Batched query helper to avoid URL length limits with large IN clauses
async function fetchBatched<T>(
  queryFn: (batch: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  userIds: string[],
  batchSize = 50,
  pageSize = 1000
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    let offset = 0;
    while (true) {
      const { data } = await queryFn(batch, offset, offset + pageSize - 1);
      if (data) results.push(...data);
      if (!data || data.length < pageSize) break;
      offset += pageSize;
    }
  }
  return results;
}

async function fetchProfilesBatched(userIds: string[]): Promise<Record<string, { email: string; username: string }>> {
  const map: Record<string, { email: string; username: string }> = {};
  const profiles = await fetchBatched(
    (batch, from, to) => supabase.from('profiles').select('user_id, email, username').in('user_id', batch).range(from, to),
    userIds
  );
  profiles.forEach((p: any) => {
    map[p.user_id] = { email: p.email || 'N/A', username: p.username || p.user_id.substring(0, 8) };
  });
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

      const userIds = [...new Set(balances.map(b => b.user_id))];

      // Parallel fetch: profiles, ledger entries, deposits, withdrawals, internal transfers, active orders
      // Use batching to avoid URL length limits with large user lists
      const [profileMap, ledgerData, depositsData, withdrawalsData, internalsData, ordersData] = await Promise.all([
        fetchProfilesBatched(userIds),
        fetchBatched<any>(
          (batch, from, to) => supabase.from('trading_balance_ledger').select('user_id, asset_symbol, entry_type, delta_available, delta_locked').in('user_id', batch).range(from, to),
          userIds
        ),
        fetchBatched<any>(
          (batch, from, to) => supabase.from('custodial_deposits').select('user_id, amount, asset_id, assets!inner(symbol)').eq('status', 'credited').in('user_id', batch).range(from, to),
          userIds
        ),
        fetchBatched<any>(
          (batch, from, to) => supabase.from('withdrawals').select('user_id, amount, fee, asset_id, assets!inner(symbol)').in('status', ['completed', 'processing']).in('user_id', batch).range(from, to),
          userIds
        ),
        fetchBatched<any>(
          (batch, from, to) => supabase.from('internal_balance_transfers').select('user_id, amount, fee, asset_symbol, direction, status').eq('status', 'completed').in('user_id', batch).range(from, to),
          userIds
        ),
        fetchBatched<any>(
          (batch, from, to) => supabase.from('orders').select('user_id, locked_amount, locked_asset_symbol, status').in('status', ['pending', 'open', 'partially_filled']).in('user_id', batch).range(from, to),
          userIds
        ),
      ]);

      // Build per-user-asset aggregates
      type Agg = { deposits: number; withdrawals: number; trade_buys: number; trade_sells: number; fees_paid: number; internal_in: number; internal_out: number; ledger_entries: number; ledger_net: number; active_orders: number; active_order_locked: number };
      const aggMap: Record<string, Agg> = {};
      const getAgg = (uid: string, sym: string): Agg => {
        const key = `${uid}:${sym}`;
        if (!aggMap[key]) aggMap[key] = { deposits: 0, withdrawals: 0, trade_buys: 0, trade_sells: 0, fees_paid: 0, internal_in: 0, internal_out: 0, ledger_entries: 0, ledger_net: 0, active_orders: 0, active_order_locked: 0 };
        return aggMap[key];
      };

      // Ledger entries
      (ledgerData || []).forEach((l: any) => {
        const a = getAgg(l.user_id, l.asset_symbol);
        a.ledger_entries++;
        a.ledger_net += Number(l.delta_available || 0) + Number(l.delta_locked || 0);
        if (l.entry_type === 'OPENING_BALANCE' || l.entry_type === 'EXTERNAL_CREDIT' || l.entry_type === 'EXTERNAL_DEBIT') {
          // These are system backfill/mirror entries - counted in ledger_net but not in individual flow categories
        } else if (l.entry_type === 'DEPOSIT' || l.entry_type === 'CREDIT') a.deposits += Number(l.delta_available || 0);
        else if (l.entry_type === 'WITHDRAWAL') a.withdrawals += Math.abs(Number(l.delta_available || 0));
        else if (l.entry_type === 'BUY_FILL' || l.entry_type === 'BUY_RECEIVE' || l.entry_type === 'FILL_CREDIT') a.trade_buys += Math.abs(Number(l.delta_available || 0) + Number(l.delta_locked || 0));
        else if (l.entry_type === 'SELL_FILL' || l.entry_type === 'SELL_DEBIT' || l.entry_type === 'FILL_DEBIT') a.trade_sells += Math.abs(Number(l.delta_available || 0) + Number(l.delta_locked || 0));
        else if (l.entry_type === 'FEE' || l.entry_type === 'FEE_CREDIT') a.fees_paid += Math.abs(Number(l.delta_available || 0));
      });

      // Deposits (fallback if ledger missing)
      (depositsData || []).forEach((d: any) => {
        const sym = d.assets?.symbol;
        if (sym) {
          const a = getAgg(d.user_id, sym);
          if (a.deposits === 0) a.deposits = Number(d.amount || 0);
        }
      });

      // Withdrawals (fallback)
      (withdrawalsData || []).forEach((w: any) => {
        const sym = w.assets?.symbol;
        if (sym) {
          const a = getAgg(w.user_id, sym);
          if (a.withdrawals === 0) a.withdrawals = Number(w.amount || 0);
          a.fees_paid += Number(w.fee || 0);
        }
      });

      // Internal transfers
      (internalsData || []).forEach((t: any) => {
        if (!t.asset_symbol) return;
        const a = getAgg(t.user_id, t.asset_symbol);
        if (t.direction === 'to_trading') a.internal_in += Number(t.amount || 0);
        else a.internal_out += Number(t.amount || 0);
      });

      // Active orders
      (ordersData || []).forEach((o: any) => {
        if (!o.locked_asset_symbol) return;
        const a = getAgg(o.user_id, o.locked_asset_symbol);
        a.active_orders++;
        a.active_order_locked += Number(o.locked_amount || 0);
      });

      return balances.map(b => {
        const sym = (b.assets as any)?.symbol || '';
        const agg = getAgg(b.user_id, sym);
        const available = Number(b.available || 0);
        const locked = Number(b.locked || 0);
        const total = available + locked;

        return {
          user_id: b.user_id,
          email: profileMap[b.user_id]?.email || 'N/A',
          username: profileMap[b.user_id]?.username || b.user_id.substring(0, 8),
          asset_symbol: sym,
          available,
          locked,
          total,
          ledger_net: agg.ledger_net,
          drift: Math.abs(total - agg.ledger_net) > 0.00001 ? total - agg.ledger_net : 0,
          deposits: agg.deposits,
          withdrawals: agg.withdrawals,
          trade_buys: agg.trade_buys,
          trade_sells: agg.trade_sells,
          fees_paid: agg.fees_paid,
          internal_in: agg.internal_in,
          internal_out: agg.internal_out,
          ledger_entries: agg.ledger_entries,
          active_orders: agg.active_orders,
          active_order_locked: agg.active_order_locked,
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
