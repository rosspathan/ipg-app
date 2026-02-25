import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Tokens to track with their BSC contract addresses
const TRACKED_TOKENS: Record<string, { address: string; decimals: number }> = {
  BNB:  { address: 'native', decimals: 18 },
  USDT: { address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
  BSK:  { address: '0x65748C6a1377bF49CDF2B4E67D54f71F2CA47c78', decimals: 18 },
  IPG:  { address: '0x4fc553E49A0305e30A6a8fFC0aaD29B40A5Ce698', decimals: 18 },
  USDI: { address: '0x4fc553E49A0305e30A6a8fFC0aaD29B40A5Ce698', decimals: 18 }, // placeholder — update if different
};

const BSC_RPC_ENDPOINTS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.binance.org',
  'https://bsc-dataseed2.binance.org',
  'https://bsc-dataseed3.binance.org',
  'https://bsc-dataseed4.binance.org',
  'https://1rpc.io/bnb',
];

/** Per-wallet on-chain balance breakdown */
export interface WalletBalance {
  address: string;
  label: string;
  balances: Record<string, number>; // symbol → balance
}

export interface TokenFlow {
  symbol: string;
  // Aggregated across ALL system wallets
  totalOnchainBalance: number;
  // Per-wallet breakdown
  perWalletBalances: { address: string; label: string; balance: number }[];
  totalDeposits: number;
  totalWithdrawals: number;
  totalInternalIn: number;
  totalInternalOut: number;
  totalFees: number;
  netFlow: number;
  expectedBalance: number;
  delta: number;
  // User liabilities
  userWithdrawable: number;
  isSolvent: boolean; // totalOnchainBalance >= userWithdrawable
}

export interface HotWalletLiveData {
  wallets: { address: string; label: string; isActive: boolean }[];
  tokenFlows: TokenFlow[];
  lastSyncAt: Date;
  recentTransactions: RecentTx[];
}

export interface RecentTx {
  id: string;
  type: 'deposit' | 'withdrawal' | 'internal_in' | 'internal_out';
  symbol: string;
  amount: number;
  txHash: string | null;
  userEmail?: string;
  createdAt: string;
  status: string;
}

// --- RPC helpers ---
async function rpcCall(method: string, params: unknown[]): Promise<any> {
  for (const endpoint of BSC_RPC_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 }),
      });
      const json = await res.json();
      if (json.result !== undefined && json.result !== null) return json.result;
    } catch { /* try next */ }
  }
  return null;
}

async function getNativeBalance(address: string): Promise<number> {
  const hex = await rpcCall('eth_getBalance', [address, 'latest']);
  if (!hex) return 0;
  return Number(BigInt(hex)) / 1e18;
}

async function getERC20Balance(contract: string, wallet: string, decimals: number): Promise<number> {
  const paddedAddr = wallet.replace('0x', '').toLowerCase().padStart(64, '0');
  const data = `0x70a08231${paddedAddr}`;
  const hex = await rpcCall('eth_call', [{ to: contract, data }, 'latest']);
  if (!hex || hex === '0x') return 0;
  return Number(BigInt(hex)) / (10 ** decimals);
}

/** Fetch on-chain balances for a single wallet address across all tracked tokens */
async function fetchWalletBalances(address: string): Promise<Record<string, number>> {
  const balances: Record<string, number> = {};
  await Promise.all(
    Object.entries(TRACKED_TOKENS).map(async ([symbol, token]) => {
      try {
        if (token.address === 'native') {
          balances[symbol] = await getNativeBalance(address);
        } else {
          balances[symbol] = await getERC20Balance(token.address, address, token.decimals);
        }
      } catch {
        balances[symbol] = 0;
      }
    })
  );
  return balances;
}

// --- Main hook ---
export function useHotWalletLive(refreshInterval = 20000) {
  const queryClient = useQueryClient();

  // Realtime subscription to re-fetch on deposits/withdrawals
  useEffect(() => {
    const ch1 = supabase.channel('hw-live-deposits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodial_deposits' }, () => {
        queryClient.invalidateQueries({ queryKey: ['hot-wallet-live'] });
      }).subscribe();
    const ch2 = supabase.channel('hw-live-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custodial_withdrawals' }, () => {
        queryClient.invalidateQueries({ queryKey: ['hot-wallet-live'] });
      }).subscribe();
    const ch3 = supabase.channel('hw-live-internal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'internal_balance_transfers' }, () => {
        queryClient.invalidateQueries({ queryKey: ['hot-wallet-live'] });
      }).subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['hot-wallet-live'],
    queryFn: async (): Promise<HotWalletLiveData> => {
      // 1. Get ALL system-controlled wallet addresses (not just trading)
      const { data: allWallets } = await supabase
        .from('platform_hot_wallet')
        .select('address, label, is_active, chain')
        .eq('chain', 'BSC');

      const systemWallets = (allWallets || []).filter(w => w.is_active);
      // Also include known addresses that might not be in DB
      const knownAddresses = new Map<string, string>();
      systemWallets.forEach(w => knownAddresses.set(w.address.toLowerCase(), w.label || 'Unknown'));

      // 2. Get asset ID map
      const { data: assets } = await supabase
        .from('assets')
        .select('id, symbol')
        .eq('is_active', true);
      const symbolById: Record<string, string> = {};
      const idBySymbol: Record<string, string> = {};
      (assets || []).forEach(a => {
        symbolById[a.id] = a.symbol;
        idBySymbol[a.symbol] = a.id;
      });

      // 3. Fetch live on-chain balances for ALL wallets in parallel
      const walletBalanceResults: WalletBalance[] = [];
      await Promise.all(
        systemWallets.map(async (w) => {
          const balances = await fetchWalletBalances(w.address);
          walletBalanceResults.push({
            address: w.address,
            label: w.label || 'Unknown',
            balances,
          });
        })
      );

      // Also call edge function for Trading Hot Wallet validation
      const edgeResult = await supabase.functions.invoke('get-admin-wallet-info').catch(() => null);

      // 4. Fetch DB aggregates in parallel
      const [depositsResult, withdrawalsResult, internalResult, userBalancesResult] = await Promise.all([
        supabase
          .from('custodial_deposits')
          .select('asset_id, amount, status')
          .eq('status', 'credited'),
        supabase
          .from('custodial_withdrawals')
          .select('asset_id, amount, fee_amount, status')
          .eq('status', 'completed'),
        supabase
          .from('internal_balance_transfers')
          .select('asset_symbol, amount, fee, direction, status')
          .eq('status', 'success'),
        // User liabilities: total withdrawable balances per asset
        supabase
          .from('wallet_balances')
          .select('asset_id, available, locked, total'),
      ]);

      // 5. Recent transactions for audit trail
      const [recentDeps, recentWds, recentInts] = await Promise.all([
        supabase
          .from('custodial_deposits')
          .select('id, asset_id, amount, tx_hash, status, created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('custodial_withdrawals')
          .select('id, asset_id, amount, tx_hash, status, created_at, user_id, fee_amount')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('internal_balance_transfers')
          .select('id, asset_symbol, amount, tx_hash, status, created_at, user_id, direction')
          .order('created_at', { ascending: false })
          .limit(50),
      ]);

      // Aggregate deposits by symbol
      const depositSums: Record<string, number> = {};
      (depositsResult.data || []).forEach(d => {
        const sym = symbolById[d.asset_id] || 'UNKNOWN';
        depositSums[sym] = (depositSums[sym] || 0) + d.amount;
      });

      // Aggregate withdrawals by symbol
      const withdrawalSums: Record<string, number> = {};
      const feeSums: Record<string, number> = {};
      (withdrawalsResult.data || []).forEach(w => {
        const sym = symbolById[w.asset_id] || 'UNKNOWN';
        withdrawalSums[sym] = (withdrawalSums[sym] || 0) + w.amount;
        feeSums[sym] = (feeSums[sym] || 0) + (w.fee_amount || 0);
      });

      // Aggregate internal transfers
      const internalIn: Record<string, number> = {};
      const internalOut: Record<string, number> = {};
      (internalResult.data || []).forEach(t => {
        if (t.direction === 'to_trading') {
          internalIn[t.asset_symbol] = (internalIn[t.asset_symbol] || 0) + t.amount;
        } else if (t.direction === 'to_wallet') {
          internalOut[t.asset_symbol] = (internalOut[t.asset_symbol] || 0) + t.amount;
        }
      });

      // Aggregate user liabilities (total balances per token)
      const userLiabilities: Record<string, number> = {};
      (userBalancesResult.data || []).forEach(b => {
        const sym = symbolById[b.asset_id] || 'UNKNOWN';
        userLiabilities[sym] = (userLiabilities[sym] || 0) + (b.total || 0);
      });

      // Build token flows with aggregated multi-wallet balances
      const trackedSymbols = Object.keys(TRACKED_TOKENS);
      const tokenFlows: TokenFlow[] = trackedSymbols.map(symbol => {
        const deposits = depositSums[symbol] || 0;
        const withdrawals = withdrawalSums[symbol] || 0;
        const intIn = internalIn[symbol] || 0;
        const intOut = internalOut[symbol] || 0;
        const fees = feeSums[symbol] || 0;
        const netFlow = deposits - withdrawals + intIn - intOut;
        const expected = netFlow;

        // Aggregate on-chain balance across ALL wallets
        const perWalletBalances = walletBalanceResults.map(wb => ({
          address: wb.address,
          label: wb.label,
          balance: wb.balances[symbol] || 0,
        }));
        const totalOnchain = perWalletBalances.reduce((sum, wb) => sum + wb.balance, 0);

        // If edge function returned data for trading wallet, use as validation
        if (edgeResult?.data?.balances?.[symbol]) {
          const tradingWallet = perWalletBalances.find(w => w.label === 'Trading Hot Wallet');
          if (tradingWallet && tradingWallet.balance === 0) {
            tradingWallet.balance = parseFloat(edgeResult.data.balances[symbol]) || 0;
          }
        }

        const userWithdrawable = userLiabilities[symbol] || 0;

        return {
          symbol,
          totalOnchainBalance: totalOnchain,
          perWalletBalances,
          totalDeposits: deposits,
          totalWithdrawals: withdrawals,
          totalInternalIn: intIn,
          totalInternalOut: intOut,
          totalFees: fees,
          netFlow,
          expectedBalance: expected,
          delta: totalOnchain - expected,
          userWithdrawable,
          isSolvent: totalOnchain >= userWithdrawable - 0.01, // small tolerance
        };
      });

      // Build recent transactions
      const recentTransactions: RecentTx[] = [];

      (recentDeps.data || []).forEach(d => {
        recentTransactions.push({
          id: d.id,
          type: 'deposit',
          symbol: symbolById[d.asset_id] || '?',
          amount: d.amount,
          txHash: d.tx_hash,
          createdAt: d.created_at || '',
          status: d.status,
        });
      });

      (recentWds.data || []).forEach(w => {
        recentTransactions.push({
          id: w.id,
          type: 'withdrawal',
          symbol: symbolById[w.asset_id] || '?',
          amount: w.amount,
          txHash: w.tx_hash,
          createdAt: w.created_at || '',
          status: w.status,
        });
      });

      (recentInts.data || []).forEach(t => {
        recentTransactions.push({
          id: t.id,
          type: t.direction === 'to_trading' ? 'internal_in' : 'internal_out',
          symbol: t.asset_symbol,
          amount: t.amount,
          txHash: t.tx_hash,
          createdAt: t.created_at,
          status: t.status,
        });
      });

      recentTransactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return {
        wallets: systemWallets.map(w => ({ address: w.address, label: w.label || 'Unknown', isActive: w.is_active })),
        tokenFlows,
        lastSyncAt: new Date(),
        recentTransactions: recentTransactions.slice(0, 100),
      };
    },
    refetchInterval: refreshInterval,
    staleTime: 10000,
  });
}
