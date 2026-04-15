import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ForensicTokenReport {
  asset_symbol: string;
  // Inflows
  total_deposits: number;        // DEPOSIT entries in ledger
  total_internal_in: number;     // to_trading transfers
  total_opening_balance: number; // OPENING_BALANCE entries
  total_refunds: number;         // REFUND entries
  total_adjustments_in: number;  // positive ADJUSTMENTs
  // Trading
  total_fill_credits: number;    // FILL_CREDIT (buy receives)
  total_fill_debits: number;     // FILL_DEBIT (sell locks consumed)
  total_order_locks: number;     // ORDER_LOCK (locked for orders)
  total_order_cancels: number;   // ORDER_CANCEL (unlocked from cancelled orders)
  // Fees
  total_fee_credits: number;     // FEE_CREDIT (platform fee account)
  // Outflows
  total_withdrawals: number;     // WITHDRAWAL entries
  total_withdrawal_queued: number;
  total_internal_out: number;    // to_wallet transfers
  total_adjustments_out: number; // negative ADJUSTMENTs
  // Current state
  ledger_net_available: number;
  ledger_net_locked: number;
  ledger_net_total: number;
  table_user_available: number;
  table_user_locked: number;
  table_user_total: number;
  platform_fee_balance: number;
  pending_withdrawals: number;
  // Drift
  available_drift: number;
  locked_drift: number;
  total_drift: number;
  // Solvency
  user_liability: number;        // What platform owes users
  user_count: number;
  discrepancy_user_count: number;
  // Proof formulas
  hot_wallet_should_hold: number; // user_liability + pending_withdrawals + platform_fees
  ledger_entry_count: number;
}

export interface ForensicUserDrift {
  user_id: string;
  email: string;
  username: string;
  asset_symbol: string;
  table_available: number;
  table_locked: number;
  table_total: number;
  ledger_available: number;
  ledger_locked: number;
  ledger_total: number;
  drift: number;
  entry_count: number;
}

export interface CircuitBreakerEvent {
  id: string;
  asset_symbol: string;
  drift_amount: number;
  threshold: number;
  triggered_action: string;
  resolved: boolean;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface DailySnapshot {
  id: string;
  run_date: string;
  asset_symbol: string;
  total_drift: number;
  discrepancy_user_count: number;
  circuit_breaker_triggered: boolean;
  created_at: string;
}

// Deep forensic token-by-token report from ledger
export function useForensicTokenReport() {
  return useQuery({
    queryKey: ['forensic-token-report'],
    queryFn: async (): Promise<ForensicTokenReport[]> => {
      // Fetch all ledger entries grouped by asset and entry_type
      const { data: ledgerAgg, error: ledgerErr } = await supabase
        .from('trading_balance_ledger')
        .select('asset_symbol, entry_type, delta_available, delta_locked');

      if (ledgerErr) throw ledgerErr;

      // Build per-token aggregation
      const tokenMap: Record<string, ForensicTokenReport> = {};
      const getToken = (sym: string): ForensicTokenReport => {
        if (!tokenMap[sym]) {
          tokenMap[sym] = {
            asset_symbol: sym,
            total_deposits: 0, total_internal_in: 0, total_opening_balance: 0,
            total_refunds: 0, total_adjustments_in: 0,
            total_fill_credits: 0, total_fill_debits: 0,
            total_order_locks: 0, total_order_cancels: 0,
            total_fee_credits: 0,
            total_withdrawals: 0, total_withdrawal_queued: 0,
            total_internal_out: 0, total_adjustments_out: 0,
            ledger_net_available: 0, ledger_net_locked: 0, ledger_net_total: 0,
            table_user_available: 0, table_user_locked: 0, table_user_total: 0,
            platform_fee_balance: 0, pending_withdrawals: 0,
            available_drift: 0, locked_drift: 0, total_drift: 0,
            user_liability: 0, user_count: 0, discrepancy_user_count: 0,
            hot_wallet_should_hold: 0, ledger_entry_count: 0,
          };
        }
        return tokenMap[sym];
      };

      for (const entry of (ledgerAgg || [])) {
        const t = getToken(entry.asset_symbol);
        const da = Number(entry.delta_available || 0);
        const dl = Number(entry.delta_locked || 0);
        t.ledger_net_available += da;
        t.ledger_net_locked += dl;
        t.ledger_entry_count++;

        switch (entry.entry_type) {
          case 'DEPOSIT': t.total_deposits += da; break;
          case 'OPENING_BALANCE': t.total_opening_balance += da + dl; break;
          case 'REFUND': t.total_refunds += da; break;
          case 'ADJUSTMENT':
            if (da + dl > 0) t.total_adjustments_in += da + dl;
            else t.total_adjustments_out += Math.abs(da + dl);
            break;
          case 'FILL_CREDIT': t.total_fill_credits += da; break;
          case 'FILL_DEBIT': t.total_fill_debits += Math.abs(dl); break;
          case 'ORDER_LOCK': t.total_order_locks += Math.abs(da); break;
          case 'ORDER_CANCEL': t.total_order_cancels += da; break;
          case 'FEE_CREDIT': t.total_fee_credits += da; break;
          case 'WITHDRAWAL': t.total_withdrawals += Math.abs(da); break;
          case 'WITHDRAWAL_QUEUED': t.total_withdrawal_queued += Math.abs(da); break;
          case 'RECONCILIATION': break; // system adjustment
        }
      }

      // Fetch balance table state
      const { data: balances } = await supabase
        .from('wallet_balances')
        .select('user_id, available, locked, asset_id, assets!inner(symbol)');

      const userSets: Record<string, Set<string>> = {};
      for (const b of (balances || [])) {
        const sym = (b.assets as any)?.symbol;
        if (!sym) continue;
        const t = getToken(sym);
        if (b.user_id === '00000000-0000-0000-0000-000000000001') {
          t.platform_fee_balance += Number(b.available || 0);
        } else {
          t.table_user_available += Number(b.available || 0);
          t.table_user_locked += Number(b.locked || 0);
          if (!userSets[sym]) userSets[sym] = new Set();
          userSets[sym].add(b.user_id);
        }
      }

      // Internal transfers (to_trading = inflow)
      const { data: internals } = await supabase
        .from('internal_balance_transfers')
        .select('asset_symbol, amount, direction, status');

      for (const tr of (internals || [])) {
        if (!tr.asset_symbol) continue;
        const t = getToken(tr.asset_symbol);
        if (tr.status === 'completed' || tr.status === 'success') {
          if (tr.direction === 'to_trading') t.total_internal_in += Number(tr.amount || 0);
          else t.total_internal_out += Number(tr.amount || 0);
        }
        if (tr.direction === 'to_wallet' && tr.status === 'pending') {
          t.pending_withdrawals += Number(tr.amount || 0);
        }
      }

      // Compute derived fields
      for (const t of Object.values(tokenMap)) {
        t.ledger_net_total = t.ledger_net_available + t.ledger_net_locked;
        t.table_user_total = t.table_user_available + t.table_user_locked;
        t.available_drift = t.table_user_available - t.ledger_net_available;
        t.locked_drift = t.table_user_locked - t.ledger_net_locked;
        t.total_drift = t.table_user_total - t.ledger_net_total;
        t.user_liability = t.table_user_total;
        t.user_count = userSets[t.asset_symbol]?.size || 0;
        t.hot_wallet_should_hold = t.user_liability + t.pending_withdrawals + t.platform_fee_balance;
      }

      return Object.values(tokenMap)
        .filter(t => t.ledger_entry_count > 0 || t.table_user_total > 0)
        .sort((a, b) => Math.abs(b.total_drift) - Math.abs(a.total_drift));
    },
    staleTime: 30000,
    refetchInterval: 120000,
  });
}

// Per-user drift report for a specific token
export function useForensicUserDrift(assetSymbol?: string) {
  return useQuery({
    queryKey: ['forensic-user-drift', assetSymbol],
    queryFn: async (): Promise<ForensicUserDrift[]> => {
      if (!assetSymbol) return [];

      // Get ledger sums per user
      const { data: ledgerData } = await supabase
        .from('trading_balance_ledger')
        .select('user_id, delta_available, delta_locked')
        .eq('asset_symbol', assetSymbol);

      // Aggregate per user
      const userLedger: Record<string, { available: number; locked: number; count: number }> = {};
      for (const e of (ledgerData || [])) {
        if (!userLedger[e.user_id]) userLedger[e.user_id] = { available: 0, locked: 0, count: 0 };
        userLedger[e.user_id].available += Number(e.delta_available || 0);
        userLedger[e.user_id].locked += Number(e.delta_locked || 0);
        userLedger[e.user_id].count++;
      }

      // Get balance table
      const { data: balances } = await supabase
        .from('wallet_balances')
        .select('user_id, available, locked, assets!inner(symbol)')
        .eq('assets.symbol', assetSymbol)
        .neq('user_id', '00000000-0000-0000-0000-000000000001');

      // Get profiles
      const allUserIds = [...new Set([
        ...Object.keys(userLedger),
        ...(balances || []).map(b => b.user_id)
      ])];

      const profileMap: Record<string, { email: string; username: string }> = {};
      for (let i = 0; i < allUserIds.length; i += 50) {
        const batch = allUserIds.slice(i, i + 50);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, email, username')
          .in('user_id', batch);
        for (const p of (profiles || [])) {
          profileMap[p.user_id] = { email: p.email || 'N/A', username: p.username || p.user_id.substring(0, 8) };
        }
      }

      // Merge: all users from both ledger and balance table
      const merged: Record<string, ForensicUserDrift> = {};
      for (const [uid, l] of Object.entries(userLedger)) {
        merged[uid] = {
          user_id: uid,
          email: profileMap[uid]?.email || 'N/A',
          username: profileMap[uid]?.username || uid.substring(0, 8),
          asset_symbol: assetSymbol,
          table_available: 0, table_locked: 0, table_total: 0,
          ledger_available: l.available, ledger_locked: l.locked,
          ledger_total: l.available + l.locked,
          drift: 0, entry_count: l.count,
        };
      }

      for (const b of (balances || [])) {
        if (!merged[b.user_id]) {
          merged[b.user_id] = {
            user_id: b.user_id,
            email: profileMap[b.user_id]?.email || 'N/A',
            username: profileMap[b.user_id]?.username || b.user_id.substring(0, 8),
            asset_symbol: assetSymbol,
            table_available: 0, table_locked: 0, table_total: 0,
            ledger_available: 0, ledger_locked: 0, ledger_total: 0,
            drift: 0, entry_count: 0,
          };
        }
        merged[b.user_id].table_available = Number(b.available || 0);
        merged[b.user_id].table_locked = Number(b.locked || 0);
        merged[b.user_id].table_total = merged[b.user_id].table_available + merged[b.user_id].table_locked;
      }

      for (const u of Object.values(merged)) {
        u.drift = u.table_total - u.ledger_total;
      }

      return Object.values(merged)
        .filter(u => u.table_total > 0.00001 || Math.abs(u.drift) > 0.001)
        .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));
    },
    enabled: !!assetSymbol,
    staleTime: 30000,
  });
}

// Circuit breaker events
export function useCircuitBreakerEvents() {
  return useQuery({
    queryKey: ['circuit-breaker-events'],
    queryFn: async (): Promise<CircuitBreakerEvent[]> => {
      const { data, error } = await supabase
        .from('reconciliation_circuit_breaker')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        drift_amount: Number(d.drift_amount),
        threshold: Number(d.threshold),
      }));
    },
    staleTime: 30000,
  });
}

// Daily snapshots
export function useDailySnapshots() {
  return useQuery({
    queryKey: ['daily-reconciliation-snapshots'],
    queryFn: async (): Promise<DailySnapshot[]> => {
      const { data, error } = await supabase
        .from('daily_trading_reconciliation')
        .select('id, run_date, asset_symbol, total_drift, discrepancy_user_count, circuit_breaker_triggered, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        total_drift: Number(d.total_drift),
      }));
    },
    staleTime: 60000,
  });
}
