import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { ethers } from "https://esm.sh/ethers@6.15.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RPC_URLS = [
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
  "https://bsc-dataseed1.defibit.io",
];

const BSK_CONTRACT = "0xD3c6cEaaBfaE093b12f3dd2E55B6d5fc1E084008";
const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955";

const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Unauthorized');

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleData) throw new Error('Forbidden');

    console.log('[Trading Full Report] Generating...');

    // ===== SECTION 1: Internal Balance Transfers =====
    const { data: transfers } = await supabase
      .from('internal_balance_transfers')
      .select('id, user_id, asset_symbol, direction, amount, fee, net_amount, status, tx_hash, reference_id, created_at')
      .order('created_at', { ascending: false });

    const completedTransfers = (transfers || []).filter(t => t.status === 'completed');
    const toTrading = completedTransfers.filter(t => t.direction === 'to_trading');
    const toWallet = completedTransfers.filter(t => t.direction === 'to_wallet' || t.direction === 'from_trading');

    // ===== SECTION 2: Custodial Deposits & Withdrawals =====
    const { data: deposits } = await supabase
      .from('custodial_deposits')
      .select('id, user_id, amount, status, tx_hash, created_at, credited_at, asset_id')
      .order('created_at', { ascending: false });

    const { data: withdrawals } = await supabase
      .from('custodial_withdrawals')
      .select('id, user_id, amount, fee_amount, status, tx_hash, to_address, created_at, completed_at')
      .order('created_at', { ascending: false });

    const creditedDeposits = (deposits || []).filter(d => d.status === 'credited');
    const completedWithdrawals = (withdrawals || []).filter(w => w.status === 'completed');

    const totalDeposited = creditedDeposits.reduce((s, d) => s + Number(d.amount || 0), 0);
    const totalWithdrawn = completedWithdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);
    const totalWithdrawalFees = completedWithdrawals.reduce((s, w) => s + Number(w.fee_amount || 0), 0);

    // ===== SECTION 3: Hot Wallet On-Chain Balance =====
    const HOT_WALLET = '0x4a6A2066b6b42FE90128351d67FB5dEA40ECACF5';
    let hotWalletBalances: Record<string, number> = {};
    let bnbBalance = 0;

    for (const rpcUrl of RPC_URLS) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const bal = await provider.getBalance(HOT_WALLET);
        bnbBalance = parseFloat(ethers.formatEther(bal));

        // BSK balance
        const bskContract = new ethers.Contract(BSK_CONTRACT, ERC20_ABI, provider);
        const bskBal = await bskContract.balanceOf(HOT_WALLET);
        hotWalletBalances['BSK'] = parseFloat(ethers.formatUnits(bskBal, 18));

        // USDT balance
        const usdtContract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, provider);
        const usdtBal = await usdtContract.balanceOf(HOT_WALLET);
        hotWalletBalances['USDT'] = parseFloat(ethers.formatUnits(usdtBal, 18));

        hotWalletBalances['BNB'] = bnbBalance;
        break;
      } catch (e) {
        console.warn(`RPC ${rpcUrl} failed:`, e.message);
      }
    }

    // ===== SECTION 4: Trading Balance Ledger =====
    const allLedger: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('trading_balance_ledger')
        .select('user_id, entry_type, reference_type, delta_available, delta_locked, asset_symbol, notes, created_at, reference_id')
        .range(from, from + batchSize - 1)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) break;
      allLedger.push(...data);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    // Ledger breakdown by type
    const ledgerByType: Record<string, { count: number; sum_available: number; sum_locked: number }> = {};
    allLedger.forEach(l => {
      const key = l.entry_type;
      if (!ledgerByType[key]) ledgerByType[key] = { count: 0, sum_available: 0, sum_locked: 0 };
      ledgerByType[key].count++;
      ledgerByType[key].sum_available += Number(l.delta_available || 0);
      ledgerByType[key].sum_locked += Number(l.delta_locked || 0);
    });

    // Recovery entries
    const recoveryEntries = allLedger.filter(l =>
      l.reference_type === 'admin' ||
      (l.notes && (l.notes.includes('Backfill') || l.notes.includes('backfill') || l.notes.includes('Migration') || l.notes.includes('Reconcil')))
    );

    // ===== SECTION 5: Trades Summary =====
    const { data: trades } = await supabase
      .from('trades')
      .select('symbol, quantity, total_value, buyer_fee, seller_fee, buyer_id, seller_id, price, created_at')
      .order('created_at', { ascending: false });

    const tradesByPair: Record<string, { count: number; volume: number; value: number; buyerFees: number; sellerFees: number }> = {};
    (trades || []).forEach(t => {
      if (!tradesByPair[t.symbol]) tradesByPair[t.symbol] = { count: 0, volume: 0, value: 0, buyerFees: 0, sellerFees: 0 };
      tradesByPair[t.symbol].count++;
      tradesByPair[t.symbol].volume += Number(t.quantity || 0);
      tradesByPair[t.symbol].value += Number(t.total_value || 0);
      tradesByPair[t.symbol].buyerFees += Number(t.buyer_fee || 0);
      tradesByPair[t.symbol].sellerFees += Number(t.seller_fee || 0);
    });

    // ===== SECTION 6: Platform Fee Balances =====
    const { data: platformFees } = await supabase
      .from('wallet_balances')
      .select('available, locked, asset_id, assets!inner(symbol)')
      .eq('user_id', '00000000-0000-0000-0000-000000000001');

    // ===== SECTION 7: User-Level Summary =====
    const { data: allBalances } = await supabase
      .from('wallet_balances')
      .select('user_id, available, locked, asset_id, assets!inner(symbol)')
      .neq('user_id', '00000000-0000-0000-0000-000000000001');

    // Build user-level ledger aggregation
    const userLedgerMap: Record<string, Record<string, { deposited: number; withdrawn: number; bought: number; sold: number; fees: number; recovered: number }>> = {};
    allLedger.forEach(l => {
      if (l.user_id === '00000000-0000-0000-0000-000000000001') return;
      const sym = l.asset_symbol || 'UNKNOWN';
      if (!userLedgerMap[l.user_id]) userLedgerMap[l.user_id] = {};
      if (!userLedgerMap[l.user_id][sym]) userLedgerMap[l.user_id][sym] = { deposited: 0, withdrawn: 0, bought: 0, sold: 0, fees: 0, recovered: 0 };
      const entry = userLedgerMap[l.user_id][sym];

      if (l.entry_type === 'DEPOSIT') entry.deposited += Number(l.delta_available || 0);
      if (l.entry_type === 'WITHDRAWAL') entry.withdrawn += Math.abs(Number(l.delta_available || 0));
      if (l.entry_type === 'FILL_CREDIT') entry.bought += Number(l.delta_available || 0);
      if (l.entry_type === 'FILL_DEBIT') entry.sold += Math.abs(Number(l.delta_locked || 0));
      if (l.entry_type === 'FEE_CREDIT') entry.fees += Number(l.delta_available || 0);
      if (l.entry_type === 'RECONCILIATION' || (l.notes && l.notes.includes('Backfill'))) {
        entry.recovered += Number(l.delta_available || 0);
      }
    });

    // Get usernames
    const allUserIds = [...new Set([
      ...(allBalances || []).map(b => b.user_id),
      ...Object.keys(userLedgerMap),
    ])];

    const profileMap: Record<string, string> = {};
    for (let i = 0; i < allUserIds.length; i += 100) {
      const batch = allUserIds.slice(i, i + 100);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, email')
        .in('user_id', batch);
      (profiles || []).forEach(p => { profileMap[p.user_id] = p.username || p.email || p.user_id.substring(0, 8); });
    }

    // Build user summaries
    const balanceMap: Record<string, Record<string, { available: number; locked: number }>> = {};
    (allBalances || []).forEach(b => {
      const sym = (b.assets as any)?.symbol || '';
      if (!balanceMap[b.user_id]) balanceMap[b.user_id] = {};
      balanceMap[b.user_id][sym] = {
        available: Number(b.available || 0),
        locked: Number(b.locked || 0),
      };
    });

    const allUsers = [...new Set([...Object.keys(userLedgerMap), ...Object.keys(balanceMap)])];
    const userSummaries = allUsers.map(uid => {
      const ledger = userLedgerMap[uid] || {};
      const bals = balanceMap[uid] || {};
      const allSymbols = [...new Set([...Object.keys(ledger), ...Object.keys(bals)])];

      return {
        user_id: uid,
        username: profileMap[uid] || uid.substring(0, 8),
        assets: allSymbols.map(sym => ({
          symbol: sym,
          deposited: ledger[sym]?.deposited || 0,
          withdrawn: ledger[sym]?.withdrawn || 0,
          bought: ledger[sym]?.bought || 0,
          sold: ledger[sym]?.sold || 0,
          recovered: ledger[sym]?.recovered || 0,
          available: bals[sym]?.available || 0,
          locked: bals[sym]?.locked || 0,
          total_balance: (bals[sym]?.available || 0) + (bals[sym]?.locked || 0),
        })),
      };
    }).filter(u => u.assets.some(a => a.total_balance > 0 || a.deposited > 0 || a.withdrawn > 0))
      .sort((a, b) => {
        const aTotal = a.assets.reduce((s, x) => s + x.total_balance, 0);
        const bTotal = b.assets.reduce((s, x) => s + x.total_balance, 0);
        return bTotal - aTotal;
      });

    // ===== SECTION 8: Reconciliation Proof =====
    // Per-asset: deposits - withdrawals = user_balances + platform_fees
    const assetTotals: Record<string, { deposits: number; withdrawals: number; userBalance: number; platformFees: number }> = {};

    creditedDeposits.forEach(d => {
      // We don't have symbol directly on custodial_deposits, use ledger
    });

    // Use ledger for accurate per-asset totals
    const ledgerAssetTotals: Record<string, { deposits: number; withdrawals: number }> = {};
    allLedger.forEach(l => {
      const sym = l.asset_symbol || 'UNKNOWN';
      if (!ledgerAssetTotals[sym]) ledgerAssetTotals[sym] = { deposits: 0, withdrawals: 0 };
      if (l.entry_type === 'DEPOSIT') ledgerAssetTotals[sym].deposits += Number(l.delta_available || 0);
      if (l.entry_type === 'WITHDRAWAL') ledgerAssetTotals[sym].withdrawals += Math.abs(Number(l.delta_available || 0));
    });

    // User totals per asset
    const userAssetTotals: Record<string, number> = {};
    (allBalances || []).forEach(b => {
      const sym = (b.assets as any)?.symbol || '';
      userAssetTotals[sym] = (userAssetTotals[sym] || 0) + Number(b.available || 0) + Number(b.locked || 0);
    });

    const platformFeeMap: Record<string, number> = {};
    (platformFees || []).forEach(p => {
      const sym = (p.assets as any)?.symbol || '';
      platformFeeMap[sym] = Number(p.available || 0);
    });

    const reconciliation = Object.keys(ledgerAssetTotals).map(sym => {
      const dep = ledgerAssetTotals[sym].deposits;
      const wth = ledgerAssetTotals[sym].withdrawals;
      const userBal = userAssetTotals[sym] || 0;
      const fees = platformFeeMap[sym] || 0;
      const expected = dep - wth;
      const actual = userBal + fees;
      return {
        asset: sym,
        total_deposits: dep,
        total_withdrawals: wth,
        expected_balance: expected,
        user_balances: userBal,
        platform_fees: fees,
        actual_balance: actual,
        discrepancy: actual - expected,
        status: Math.abs(actual - expected) < 0.01 ? 'BALANCED' : 'MISMATCH',
      };
    });

    // Recovery summary
    const recoverySummary: Record<string, { count: number; total: number; entries: any[] }> = {};
    recoveryEntries.forEach(r => {
      const sym = r.asset_symbol || 'UNKNOWN';
      if (!recoverySummary[sym]) recoverySummary[sym] = { count: 0, total: 0, entries: [] };
      recoverySummary[sym].count++;
      recoverySummary[sym].total += Number(r.delta_available || 0);
      recoverySummary[sym].entries.push({
        user_id: r.user_id,
        username: profileMap[r.user_id] || r.user_id?.substring(0, 8),
        amount: Number(r.delta_available || 0),
        type: r.entry_type,
        notes: r.notes,
        date: r.created_at,
      });
    });

    const report = {
      generated_at: new Date().toISOString(),

      // Section 1: Internal transfers
      internal_transfers: {
        to_trading: {
          count: toTrading.length,
          total_amount: toTrading.reduce((s, t) => s + Number(t.amount || 0), 0),
          total_fees: toTrading.reduce((s, t) => s + Number(t.fee || 0), 0),
        },
        to_wallet: {
          count: toWallet.length,
          total_amount: toWallet.reduce((s, t) => s + Number(t.amount || 0), 0),
          total_fees: toWallet.reduce((s, t) => s + Number(t.fee || 0), 0),
        },
        details: (transfers || []).slice(0, 200).map(t => ({
          ...t,
          username: profileMap[t.user_id] || t.user_id?.substring(0, 8),
        })),
      },

      // Section 2: Hot wallet
      hot_wallet: {
        address: HOT_WALLET,
        on_chain_balances: hotWalletBalances,
        bnb_gas: bnbBalance,
        total_custodial_deposits: totalDeposited,
        total_custodial_withdrawals: totalWithdrawn,
        total_withdrawal_fees: totalWithdrawalFees,
        deposit_count: creditedDeposits.length,
        withdrawal_count: completedWithdrawals.length,
      },

      // Section 3: Recovered balances
      recovery: {
        total_recovery_entries: recoveryEntries.length,
        by_asset: recoverySummary,
      },

      // Section 4: Trading activity
      trading_activity: {
        total_trades: (trades || []).length,
        by_pair: tradesByPair,
        total_fees_collected: platformFeeMap,
      },

      // Section 5: Ledger breakdown
      ledger_breakdown: ledgerByType,

      // Section 6: Reconciliation proof
      reconciliation,

      // Section 7: User summaries
      user_summaries: userSummaries,
      total_users: userSummaries.length,
    };

    console.log(`[Trading Full Report] Generated: ${userSummaries.length} users, ${allLedger.length} ledger entries`);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Trading Full Report] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
