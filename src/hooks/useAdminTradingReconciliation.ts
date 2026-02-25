import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AssetReconciliation {
  asset_symbol: string;
  total_deposits: number;
  total_withdrawals: number;
  total_user_available: number;
  total_user_locked: number;
  total_user_balance: number;
  total_platform_fees: number;
  expected_balance: number;
  discrepancy: number;
  user_count: number;
}

export interface UserReconciliation {
  user_id: string;
  username: string;
  asset_symbol: string;
  deposits: number;
  withdrawals: number;
  trade_credits: number;
  trade_debits: number;
  available: number;
  locked: number;
  total: number;
  ledger_net: number;
  drift: number;
}

export interface LedgerStats {
  total_entries: number;
  entry_types: { entry_type: string; count: number }[];
  last_entry_at: string | null;
}

export function useGlobalReconciliation() {
  return useQuery({
    queryKey: ['admin-trading-reconciliation-global'],
    queryFn: async (): Promise<AssetReconciliation[]> => {
      // Get total deposits per asset (on-chain inflows)
      const { data: deposits } = await supabase
        .from('custodial_deposits')
        .select('asset_id, amount, assets!inner(symbol)')
        .eq('status', 'credited');

      // Get total withdrawals per asset (manual/legacy)
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('asset_id, amount, assets!inner(symbol)')
        .in('status', ['completed', 'processing']);

      // Get custodial withdrawals (auto-processed outflows)
      const { data: custWithdrawals } = await supabase
        .from('custodial_withdrawals')
        .select('asset_id, amount, fee_amount, assets!inner(symbol)')
        .in('status', ['completed', 'processing', 'sent']);

      // Get all user balances per asset (exclude platform account)
      const { data: balances } = await supabase
        .from('wallet_balances')
        .select('asset_id, available, locked, user_id, assets!inner(symbol)')
        .neq('user_id', '00000000-0000-0000-0000-000000000001');

      // Get platform fee balances
      const { data: platformBalances } = await supabase
        .from('wallet_balances')
        .select('asset_id, available, assets!inner(symbol)')
        .eq('user_id', '00000000-0000-0000-0000-000000000001');

      // Get internal balance transfers
      const { data: internalTransfers } = await supabase
        .from('internal_balance_transfers')
        .select('asset_symbol, amount, direction, status')
        .eq('status', 'completed');

      // Aggregate by asset
      const assetMap: Record<string, AssetReconciliation> = {};

      const getOrCreate = (symbol: string): AssetReconciliation => {
        if (!assetMap[symbol]) {
          assetMap[symbol] = {
            asset_symbol: symbol,
            total_deposits: 0,
            total_withdrawals: 0,
            total_user_available: 0,
            total_user_locked: 0,
            total_user_balance: 0,
            total_platform_fees: 0,
            expected_balance: 0,
            discrepancy: 0,
            user_count: 0,
          };
        }
        return assetMap[symbol];
      };

      (deposits || []).forEach(d => {
        const sym = (d.assets as any)?.symbol;
        if (sym) getOrCreate(sym).total_deposits += Number(d.amount || 0);
      });

      (withdrawals || []).forEach(w => {
        const sym = (w.assets as any)?.symbol;
        if (sym) getOrCreate(sym).total_withdrawals += Number(w.amount || 0);
      });

      // Include custodial withdrawals as outflows
      (custWithdrawals || []).forEach(w => {
        const sym = (w.assets as any)?.symbol;
        if (sym) getOrCreate(sym).total_withdrawals += Number(w.amount || 0);
      });

      // Track unique users per asset
      const userSets: Record<string, Set<string>> = {};
      (balances || []).forEach(b => {
        const sym = (b.assets as any)?.symbol;
        if (sym) {
          const entry = getOrCreate(sym);
          entry.total_user_available += Number(b.available || 0);
          entry.total_user_locked += Number(b.locked || 0);
          entry.total_user_balance += Number(b.available || 0) + Number(b.locked || 0);
          if (!userSets[sym]) userSets[sym] = new Set();
          userSets[sym].add(b.user_id);
        }
      });

      (platformBalances || []).forEach(p => {
        const sym = (p.assets as any)?.symbol;
        if (sym) getOrCreate(sym).total_platform_fees = Number(p.available || 0);
      });

      // Internal transfers: to_trading = inflow to trading, to_wallet = outflow from trading
      (internalTransfers || []).forEach(t => {
        if (t.asset_symbol) {
          const entry = getOrCreate(t.asset_symbol);
          if (t.direction === 'to_trading') {
            entry.total_deposits += Number(t.amount || 0);
          } else if (t.direction === 'to_wallet') {
            entry.total_withdrawals += Number(t.amount || 0);
          }
        }
      });

      // Calculate expected and discrepancy
      // Expected = total inflows - total outflows (what should remain in the system)
      // Actual = user balances + platform fees
      // Discrepancy = Actual - Expected
      // NOTE: Positive discrepancy means more tokens exist than on-chain deposits justify.
      // Common legitimate causes: admin credits, ad mining rewards, badge bonuses, referral rewards.
      Object.values(assetMap).forEach(a => {
        a.user_count = userSets[a.asset_symbol]?.size || 0;
        a.expected_balance = a.total_deposits - a.total_withdrawals;
        a.discrepancy = (a.total_user_balance + a.total_platform_fees) - a.expected_balance;
      });

      return Object.values(assetMap).sort((a, b) => 
        Math.abs(b.discrepancy) - Math.abs(a.discrepancy)
      );
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useUserReconciliation(assetSymbol?: string) {
  return useQuery({
    queryKey: ['admin-trading-reconciliation-users', assetSymbol],
    queryFn: async (): Promise<UserReconciliation[]> => {
      // Get user balances with profile info
      let balanceQuery = supabase
        .from('wallet_balances')
        .select('user_id, available, locked, asset_id, assets!inner(symbol)')
        .neq('user_id', '00000000-0000-0000-0000-000000000001');

      if (assetSymbol) {
        balanceQuery = balanceQuery.eq('assets.symbol', assetSymbol);
      }

      const { data: balances } = await balanceQuery;

      if (!balances || balances.length === 0) return [];

      // Get ledger sums per user per asset
      const { data: ledgerSums } = await supabase.rpc('get_user_ledger_summary' as any);

      // Get usernames
      const userIds = [...new Set((balances || []).map(b => b.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds.slice(0, 100));

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach(p => { profileMap[p.id] = p.username || 'Unknown'; });

      // Build ledger map
      const ledgerMap: Record<string, any> = {};
      (ledgerSums as any[] || []).forEach((l: any) => {
        const key = `${l.user_id}:${l.asset_symbol}`;
        ledgerMap[key] = l;
      });

      return (balances || []).map(b => {
        const sym = (b.assets as any)?.symbol || '';
        const key = `${b.user_id}:${sym}`;
        const ledger = ledgerMap[key] || {};
        const available = Number(b.available || 0);
        const locked = Number(b.locked || 0);
        const total = available + locked;
        const ledgerNet = Number(ledger.net_delta || 0);

        return {
          user_id: b.user_id,
          username: profileMap[b.user_id] || b.user_id.substring(0, 8),
          asset_symbol: sym,
          deposits: Number(ledger.total_deposits || 0),
          withdrawals: Number(ledger.total_withdrawals || 0),
          trade_credits: Number(ledger.total_credits || 0),
          trade_debits: Number(ledger.total_debits || 0),
          available,
          locked,
          total,
          ledger_net: ledgerNet,
          drift: Math.abs(total - ledgerNet) > 0.00001 ? total - ledgerNet : 0,
        };
      }).filter(u => u.total > 0.00001 || Math.abs(u.drift) > 0.00001)
        .sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));
    },
    enabled: true,
    staleTime: 30000,
  });
}

export function useLedgerStats() {
  return useQuery({
    queryKey: ['admin-trading-ledger-stats'],
    queryFn: async (): Promise<LedgerStats> => {
      // Get total count without LIMIT
      const { count, error: countError } = await supabase
        .from('trading_balance_ledger')
        .select('id', { count: 'exact', head: true });

      // Get entry type breakdown
      const { data: entries, error } = await supabase
        .from('trading_balance_ledger')
        .select('entry_type, created_at')
        .order('created_at', { ascending: false })
        .limit(10000);

      if (error || countError) throw error || countError;

      const typeCounts: Record<string, number> = {};
      let lastEntry: string | null = null;

      (entries || []).forEach((e, i) => {
        typeCounts[e.entry_type] = (typeCounts[e.entry_type] || 0) + 1;
        if (i === 0) lastEntry = e.created_at;
      });

      return {
        total_entries: count || entries?.length || 0,
        entry_types: Object.entries(typeCounts).map(([entry_type, count]) => ({ entry_type, count }))
          .sort((a, b) => b.count - a.count),
        last_entry_at: lastEntry,
      };
    },
    staleTime: 30000,
  });
}
