import React, { useState } from 'react';
import { useGlobalReconciliation, useLedgerStats } from '@/hooks/useAdminTradingReconciliation';
import { useTransferHistory, useUserAuditWithEmail, useHotWalletTransparency } from '@/hooks/useAdminReconciliationReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, AlertTriangle, CheckCircle2, Search, Shield, Database, TrendingUp, Activity, ChevronDown, ChevronRight, Download, Wallet, ArrowUpDown, FileText, Wrench, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

function fmt(n: number, decimals = 4): string {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) { toast.error('No data to export'); return; }
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  link.click();
  toast.success(`${filename} CSV exported`);
}

export default function AdminTradingReconciliation() {
  const { data: globalData, isLoading: globalLoading, refetch: refetchGlobal } = useGlobalReconciliation();
  const { data: ledgerStats, isLoading: statsLoading } = useLedgerStats();
  const [selectedAsset, setSelectedAsset] = useState<string | undefined>();
  const { data: userData, isLoading: usersLoading, refetch: refetchUsers } = useUserAuditWithEmail(selectedAsset);
  const { data: transferData, isLoading: transfersLoading } = useTransferHistory();
  const { data: hotWalletData, isLoading: hotWalletLoading } = useHotWalletTransparency();
  const [searchUser, setSearchUser] = useState('');
  const [searchTransfer, setSearchTransfer] = useState('');
  const [isRunningRecon, setIsRunningRecon] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [fixingUser, setFixingUser] = useState<string | null>(null);
  const [showOnlyDrift, setShowOnlyDrift] = useState(false);
  const [expandedTransfers, setExpandedTransfers] = useState<Set<string>>(new Set());
  const toggleTransferExpand = (id: string) => {
    setExpandedTransfers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stats: true, global: true, users: true, transfers: true, hotwallet: true,
  });

  const toggle = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  const handleRunReconciliation = async () => {
    setIsRunningRecon(true);
    try {
      const { data, error } = await supabase.functions.invoke('full-trading-reconciliation', {
        body: { action: 'check' }
      });
      if (error) throw error;
      toast.success(`Reconciliation complete: ${data.discrepancies?.length || 0} discrepancies found`);
      refetchGlobal();
      refetchUsers();
    } catch (err: any) {
      toast.error(`Reconciliation failed: ${err.message}`);
    } finally {
      setIsRunningRecon(false);
    }
  };

  const hasAnyMismatch = (globalData || []).some(a => Math.abs(a.discrepancy) > 0.01);

  const toggleUserExpand = (key: string) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleFixUser = async (userId: string) => {
    setFixingUser(userId);
    try {
      const { data, error } = await supabase.rpc('force_reconcile_all_balances', { p_user_id: userId });
      if (error) throw error;
      toast.success(`Reconciliation applied for ${userId.substring(0, 8)}`);
      refetchUsers();
    } catch (err: any) {
      toast.error(`Fix failed: ${err.message}`);
    } finally {
      setFixingUser(null);
    }
  };

  const handleFixGhostLocks = async () => {
    try {
      const { data, error } = await supabase.rpc('fix_ghost_locks');
      if (error) throw error;
      const fixed = (data as any[]) || [];
      toast.success(`Fixed ${fixed.length} ghost locks`);
      refetchUsers();
    } catch (err: any) {
      toast.error(`Ghost lock fix failed: ${err.message}`);
    }
  };

  const filteredUsers = (userData || []).filter(u => {
    if (showOnlyDrift && Math.abs(u.drift) < 0.00001) return false;
    return !searchUser ||
      u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.user_id.toLowerCase().includes(searchUser.toLowerCase());
  });

  const filteredTransfers = (transferData || []).filter(t =>
    !searchTransfer ||
    t.email.toLowerCase().includes(searchTransfer.toLowerCase()) ||
    t.username.toLowerCase().includes(searchTransfer.toLowerCase()) ||
    t.tx_hash?.toLowerCase().includes(searchTransfer.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTransfer.toLowerCase())
  );

  // Export handlers
  const handleExportUsers = () => {
    exportCSV(filteredUsers.map(u => ({
      user_id: u.user_id,
      email: u.email,
      username: u.username,
      asset: u.asset_symbol,
      available: u.available.toFixed(4),
      locked: u.locked.toFixed(4),
      total: u.total.toFixed(4),
      deposits: u.deposits.toFixed(4),
      withdrawals: u.withdrawals.toFixed(4),
      trade_buys: u.trade_buys.toFixed(4),
      trade_sells: u.trade_sells.toFixed(4),
      fees_paid: u.fees_paid.toFixed(4),
      internal_in: u.internal_in.toFixed(4),
      internal_out: u.internal_out.toFixed(4),
      ledger_entries: u.ledger_entries,
      ledger_net: u.ledger_net.toFixed(4),
      drift: u.drift.toFixed(4),
      active_orders: u.active_orders,
      active_order_locked: u.active_order_locked.toFixed(4),
      ghost_lock: u.locked > 0 && u.active_orders === 0 ? 'YES' : 'NO',
    })), 'user-audit-report');
  };

  const handleExportTransfers = () => {
    exportCSV(filteredTransfers.map(t => ({
      transaction_id: t.id,
      email: t.email,
      username: t.username,
      direction: t.direction === 'to_trading' ? 'On-Chain → Trading' : 'Trading → On-Chain',
      token: t.asset_symbol,
      amount: t.amount.toFixed(4),
      fee: t.fee.toFixed(4),
      net_amount: t.net_amount.toFixed(4),
      status: t.status,
      tx_hash: t.tx_hash || '',
      balance_after: t.balance_after?.toFixed(4) || '',
      date_utc: t.created_at,
      reference_id: t.reference_id || '',
      notes: t.notes || '',
    })), 'transfer-history');
  };

  const handleExportHotWallet = () => {
    if (!hotWalletData?.flows.length) { toast.error('No data'); return; }
    const grandInflow = hotWalletData.flows.reduce((s, f) => s + f.total_deposits + f.total_internal_in, 0);
    const grandOutflow = hotWalletData.flows.reduce((s, f) => s + f.total_withdrawals + f.total_internal_out, 0);
    const rows = [
      ...hotWalletData.flows.map(f => ({
        asset: f.asset_symbol,
        user_deposits: f.total_deposits.toFixed(4),
        deposit_count: f.deposit_count,
        internal_transfers_in: f.total_internal_in.toFixed(4),
        internal_in_count: f.internal_in_count,
        user_withdrawals: f.total_withdrawals.toFixed(4),
        withdrawal_count: f.withdrawal_count,
        internal_transfers_out: f.total_internal_out.toFixed(4),
        internal_out_count: f.internal_out_count,
        fees_collected: f.total_fees_collected.toFixed(4),
        net_balance: f.net_balance.toFixed(4),
      })),
      {
        asset: 'GRAND TOTAL',
        user_deposits: grandInflow.toFixed(4),
        deposit_count: '',
        internal_transfers_in: '',
        internal_in_count: '',
        user_withdrawals: grandOutflow.toFixed(4),
        withdrawal_count: '',
        internal_transfers_out: '',
        internal_out_count: '',
        fees_collected: hotWalletData.flows.reduce((s, f) => s + f.total_fees_collected, 0).toFixed(4),
        net_balance: (grandInflow - grandOutflow).toFixed(4),
      },
    ];
    exportCSV(rows, 'hot-wallet-transparency');
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)]">Trading Reconciliation</h1>
          <p className="text-sm text-[hsl(240_10%_70%)]">Real-time balance audit, transfer history & hot wallet transparency</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => { refetchGlobal(); refetchUsers(); }}
            className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={handleRunReconciliation} disabled={isRunningRecon}
            className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_55%)] text-white">
            <Shield className="h-4 w-4 mr-1" />
            {isRunningRecon ? 'Running...' : 'Full Reconciliation'}
          </Button>
        </div>
      </div>

      {/* System Status Banner */}
      {hasAnyMismatch ? (
        <div className="bg-[hsl(0_70%_20%/0.3)] border border-[hsl(0_70%_50%/0.5)] rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-[hsl(0_70%_68%)] shrink-0" />
          <div>
            <p className="font-semibold text-[hsl(0_70%_68%)]">⚠️ Balance Mismatch Detected</p>
            <p className="text-sm text-[hsl(0_70%_80%)]">Discrepancies found between expected and actual balances.</p>
          </div>
        </div>
      ) : !globalLoading && (
        <div className="bg-[hsl(145_70%_20%/0.3)] border border-[hsl(145_70%_50%/0.5)] rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-[hsl(145_70%_60%)] shrink-0" />
          <div>
            <p className="font-semibold text-[hsl(145_70%_60%)]">✅ System Balanced</p>
            <p className="text-sm text-[hsl(145_70%_80%)]">All trading balances reconcile within tolerance.</p>
          </div>
        </div>
      )}

      {/* ═══ SECTION 1: Ledger Stats ═══ */}
      <Collapsible open={expandedSections.stats} onOpenChange={() => toggle('stats')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Database className="h-5 w-5 text-[hsl(262_100%_65%)]" /> Ledger Overview</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.stats ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="h-4 w-4 text-[hsl(262_100%_65%)]" />
                    <span className="text-xs text-[hsl(240_10%_70%)]">Ledger Entries</span>
                  </div>
                  <p className="text-xl font-bold text-[hsl(0_0%_98%)]">{statsLoading ? '...' : ledgerStats?.total_entries?.toLocaleString()}</p>
                </div>
                <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-[hsl(145_70%_60%)]" />
                    <span className="text-xs text-[hsl(240_10%_70%)]">Entry Types</span>
                  </div>
                  <p className="text-xl font-bold text-[hsl(0_0%_98%)]">{statsLoading ? '...' : ledgerStats?.entry_types?.length}</p>
                </div>
                <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-[hsl(45_100%_60%)]" />
                    <span className="text-xs text-[hsl(240_10%_70%)]">Assets Tracked</span>
                  </div>
                  <p className="text-xl font-bold text-[hsl(0_0%_98%)]">{globalLoading ? '...' : globalData?.length}</p>
                </div>
                <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-[hsl(262_100%_65%)]" />
                    <span className="text-xs text-[hsl(240_10%_70%)]">Last Entry</span>
                  </div>
                  <p className="text-sm font-bold text-[hsl(0_0%_98%)]">
                    {statsLoading ? '...' : ledgerStats?.last_entry_at ? format(new Date(ledgerStats.last_entry_at), 'MMM d, HH:mm') : 'N/A'}
                  </p>
                </div>
              </div>
              {ledgerStats?.entry_types && (
                <div className="flex flex-wrap gap-2">
                  {ledgerStats.entry_types.map(et => {
                    const isSnapshot = et.entry_type === 'OPENING_BALANCE';
                    const isExternal = et.entry_type === 'EXTERNAL_CREDIT' || et.entry_type === 'EXTERNAL_DEBIT';
                    return (
                      <Badge key={et.entry_type} variant="outline" className={
                        isSnapshot ? 'border-[hsl(262_100%_65%/0.5)] text-[hsl(262_100%_65%)] bg-[hsl(262_100%_65%/0.1)]' :
                        isExternal ? 'border-[hsl(45_100%_50%/0.5)] text-[hsl(45_100%_60%)] bg-[hsl(45_100%_50%/0.1)]' :
                        'border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]'
                      }>
                        {isSnapshot ? '📸 ' : isExternal ? '🔗 ' : ''}{et.entry_type}: <span className="ml-1 text-[hsl(0_0%_98%)] font-bold">{et.count}</span>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ SECTION 2: Global Asset Balances ═══ */}
      <Collapsible open={expandedSections.global} onOpenChange={() => toggle('global')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[hsl(262_100%_65%)]" /> Global Asset Balances</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.global ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
           <CollapsibleContent>
            <CardContent>
              {/* Formula explanation */}
              <div className="bg-[hsl(235_28%_12%)] border border-[hsl(235_20%_22%)] rounded-lg p-3 mb-4 text-xs">
                <p className="text-[hsl(262_100%_65%)] font-semibold mb-1">Reconciliation Formula</p>
                <p className="text-[hsl(240_10%_70%)] font-mono">
                  Expected = (On-chain Deposits + Internal In) − (Withdrawals + Custodial Withdrawals + Internal Out)
                </p>
                <p className="text-[hsl(240_10%_70%)] font-mono">
                  Actual = Sum(User Balances) + Platform Fee Account
                </p>
                <p className="text-[hsl(240_10%_70%)] font-mono">
                  Δ = Actual − Expected
                </p>
                <p className="text-[hsl(45_100%_60%)] mt-1.5 text-[10px]">
                  ⚠ Positive Δ = tokens entered through off-chain channels (admin credits, ad mining, badge/referral rewards). These are legitimate if matched to reward records.
                </p>
              </div>

              {/* Backfill status */}
              {ledgerStats?.entry_types?.some(et => et.entry_type === 'OPENING_BALANCE') && (
                <div className="bg-[hsl(262_100%_20%/0.2)] border border-[hsl(262_100%_65%/0.3)] rounded-lg p-3 mb-4 text-xs flex items-center gap-2">
                  <span className="text-lg">📸</span>
                  <div>
                    <p className="text-[hsl(262_100%_65%)] font-semibold">Historical Snapshot Applied</p>
                    <p className="text-[hsl(240_10%_70%)]">
                      OPENING_BALANCE entries backfilled for {ledgerStats.entry_types.find(et => et.entry_type === 'OPENING_BALANCE')?.count || 0} user-asset pairs.
                      Ledger now reconciles from Dec 17, 2025. Any new drift post-backfill indicates a missing integration.
                    </p>
                  </div>
                </div>
              )}

              {globalLoading ? (
                <p className="text-[hsl(240_10%_70%)]">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(235_20%_22%)]">
                        <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">Asset</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Deposits (In)</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Withdrawals (Out)</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Expected</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Actual (Users)</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Fees Acct</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Locked</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Users</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Δ (Diff)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(globalData || []).map(a => (
                        <tr key={a.asset_symbol} className="border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)]">
                          <td className="py-2 font-semibold text-[hsl(0_0%_98%)]">{a.asset_symbol}</td>
                          <td className="text-right py-2 text-[hsl(145_70%_60%)]">+{fmt(a.total_deposits)}</td>
                          <td className="text-right py-2 text-[hsl(0_70%_68%)]">-{fmt(a.total_withdrawals)}</td>
                          <td className="text-right py-2 text-[hsl(240_10%_70%)] font-mono">{fmt(a.expected_balance)}</td>
                          <td className="text-right py-2 text-[hsl(0_0%_98%)] font-semibold">{fmt(a.total_user_balance)}</td>
                          <td className="text-right py-2 text-[hsl(262_100%_65%)]">{fmt(a.total_platform_fees)}</td>
                          <td className="text-right py-2 text-[hsl(45_100%_60%)]">{fmt(a.total_user_locked)}</td>
                          <td className="text-right py-2 text-[hsl(240_10%_70%)]">{a.user_count}</td>
                          <td className="text-right py-2">
                            {Math.abs(a.discrepancy) > 0.01 ? (
                              <Badge className={`text-xs ${a.discrepancy > 0 ? 'bg-[hsl(45_100%_20%)] text-[hsl(45_100%_60%)]' : 'bg-[hsl(0_70%_20%)] text-[hsl(0_70%_68%)]'}`}>
                                {a.discrepancy > 0 ? '+' : ''}{a.discrepancy.toFixed(4)}
                              </Badge>
                            ) : (
                              <Badge className="bg-[hsl(145_70%_20%)] text-[hsl(145_70%_60%)] text-xs">✓ OK</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ SECTION 3: User-Level Audit (with Email) ═══ */}
      <Collapsible open={expandedSections.users} onOpenChange={() => toggle('users')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Shield className="h-5 w-5 text-[hsl(262_100%_65%)]" /> User-Level Audit</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.users ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-[hsl(240_10%_50%)]" />
                    <Input
                      placeholder="Search user or email..."
                      value={searchUser}
                      onChange={e => setSearchUser(e.target.value)}
                      className="pl-8 bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%)] text-[hsl(0_0%_98%)] text-sm h-9"
                    />
                  </div>
                  <Select value={selectedAsset || 'all'} onValueChange={v => setSelectedAsset(v === 'all' ? undefined : v)}>
                    <SelectTrigger className="w-28 bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%)] text-[hsl(0_0%_98%)] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%)]">
                      <SelectItem value="all">All</SelectItem>
                      {(globalData || []).map(a => (
                        <SelectItem key={a.asset_symbol} value={a.asset_symbol}>{a.asset_symbol}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant={showOnlyDrift ? "default" : "outline"} size="sm"
                    onClick={() => setShowOnlyDrift(!showOnlyDrift)}
                    className={showOnlyDrift
                      ? "bg-[hsl(0_70%_50%)] hover:bg-[hsl(0_70%_40%)] text-white h-9"
                      : "border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)] h-9"}>
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Drift Only
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleFixGhostLocks}
                    className="border-[hsl(235_20%_22%)] text-[hsl(45_100%_60%)]">
                    <Wrench className="h-4 w-4 mr-1" /> Fix Ghost Locks
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportUsers}
                    className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
                    <Download className="h-4 w-4 mr-1" /> CSV
                  </Button>
                </div>
              </div>

              {/* Drift summary */}
              {userData && (
                <div className="flex gap-3 mb-3 text-xs">
                  <span className="text-[hsl(240_10%_70%)]">Total users: <span className="text-[hsl(0_0%_98%)] font-bold">{userData.length}</span></span>
                  <span className="text-[hsl(240_10%_70%)]">With drift: <span className="text-[hsl(0_70%_68%)] font-bold">{userData.filter(u => Math.abs(u.drift) > 0.00001).length}</span></span>
                  <span className="text-[hsl(240_10%_70%)]">With ghost locks: <span className="text-[hsl(45_100%_60%)] font-bold">{userData.filter(u => u.locked > 0 && u.active_orders === 0).length}</span></span>
                </div>
              )}

              {usersLoading ? (
                <p className="text-[hsl(240_10%_70%)]">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[hsl(235_20%_22%)]">
                        <th className="w-6"></th>
                        <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">User</th>
                        <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">Email</th>
                        <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">Asset</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Available</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Locked</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Total</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Ledger</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Drift</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.slice(0, 200).map((u, i) => {
                        const rowKey = `${u.user_id}-${u.asset_symbol}`;
                        const isExpanded = expandedUsers.has(rowKey);
                        const hasDrift = Math.abs(u.drift) > 0.00001;
                        const hasGhostLock = u.locked > 0 && u.active_orders === 0;
                        return (
                          <React.Fragment key={`${rowKey}-${i}`}>
                            <tr
                              className={`border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)] cursor-pointer ${hasDrift ? 'bg-[hsl(0_70%_20%/0.08)]' : ''}`}
                              onClick={() => toggleUserExpand(rowKey)}
                            >
                              <td className="py-2 pl-2">
                                {isExpanded
                                  ? <ChevronDown className="h-3.5 w-3.5 text-[hsl(240_10%_50%)]" />
                                  : <ChevronRight className="h-3.5 w-3.5 text-[hsl(240_10%_50%)]" />}
                              </td>
                              <td className="py-2 text-[hsl(0_0%_98%)] font-mono text-xs">{u.username}</td>
                              <td className="py-2 text-[hsl(240_10%_70%)] text-xs max-w-[140px] truncate">{u.email}</td>
                              <td className="py-2 text-[hsl(262_100%_65%)]">{u.asset_symbol}</td>
                              <td className="text-right py-2 text-[hsl(0_0%_98%)]">{fmt(u.available)}</td>
                              <td className="text-right py-2">
                                <span className={hasGhostLock ? 'text-[hsl(0_70%_68%)] font-bold' : 'text-[hsl(45_100%_60%)]'}>
                                  {fmt(u.locked)}
                                </span>
                                {hasGhostLock && <span className="text-[hsl(0_70%_68%)] ml-1" title="Ghost lock: locked balance with no active orders">👻</span>}
                              </td>
                              <td className="text-right py-2 text-[hsl(0_0%_98%)] font-semibold">{fmt(u.total)}</td>
                              <td className="text-right py-2 text-[hsl(240_10%_70%)]">{fmt(u.ledger_net)}</td>
                              <td className="text-right py-2">
                                {hasDrift ? (
                                  <span className="text-[hsl(0_70%_68%)] font-bold">{u.drift.toFixed(4)}</span>
                                ) : (
                                  <span className="text-[hsl(145_70%_60%)]">✓</span>
                                )}
                              </td>
                              <td className="text-right py-2" onClick={e => e.stopPropagation()}>
                                {(hasDrift || hasGhostLock) && (
                                  <Button size="sm" variant="outline"
                                    disabled={fixingUser === u.user_id}
                                    onClick={() => handleFixUser(u.user_id)}
                                    className="h-6 px-2 text-[10px] border-[hsl(45_100%_50%/0.5)] text-[hsl(45_100%_60%)] hover:bg-[hsl(45_100%_50%/0.1)]">
                                    <Wrench className="h-3 w-3 mr-0.5" />
                                    {fixingUser === u.user_id ? '...' : 'Fix'}
                                  </Button>
                                )}
                              </td>
                            </tr>
                            {/* Expanded detail row */}
                            {isExpanded && (
                              <tr className="bg-[hsl(235_28%_12%)]">
                                <td colSpan={10} className="p-3">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 text-xs">
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Deposits</p>
                                      <p className="text-[hsl(145_70%_60%)] font-mono font-bold">{fmt(u.deposits)}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Withdrawals</p>
                                      <p className="text-[hsl(0_70%_68%)] font-mono font-bold">{fmt(u.withdrawals)}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Trade Buys</p>
                                      <p className="text-[hsl(145_70%_60%)] font-mono font-bold">{fmt(u.trade_buys)}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Trade Sells</p>
                                      <p className="text-[hsl(0_70%_68%)] font-mono font-bold">{fmt(u.trade_sells)}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Fees Paid</p>
                                      <p className="text-[hsl(45_100%_60%)] font-mono font-bold">{fmt(u.fees_paid)}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Internal In</p>
                                      <p className="text-[hsl(145_70%_60%)] font-mono font-bold">{fmt(u.internal_in)}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Internal Out</p>
                                      <p className="text-[hsl(0_70%_68%)] font-mono font-bold">{fmt(u.internal_out)}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Ledger Entries</p>
                                      <p className="text-[hsl(0_0%_98%)] font-mono font-bold">{u.ledger_entries}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Active Orders</p>
                                      <p className="text-[hsl(262_100%_65%)] font-mono font-bold">{u.active_orders}</p>
                                    </div>
                                    <div className="bg-[hsl(235_28%_15%)] rounded-lg p-2.5 border border-[hsl(235_20%_22%)]">
                                      <p className="text-[hsl(240_10%_50%)] text-[10px] mb-0.5">Order Locked</p>
                                      <p className="text-[hsl(45_100%_60%)] font-mono font-bold">{fmt(u.active_order_locked)}</p>
                                    </div>
                                  </div>
                                  {/* Reconciliation proof for this user */}
                                  <div className="mt-3 bg-[hsl(235_28%_15%)] rounded-lg p-3 border border-[hsl(235_20%_22%)] text-xs font-mono space-y-1">
                                    <p className="text-[hsl(262_100%_65%)] font-semibold text-[11px] mb-1.5">Balance Proof</p>
                                    <p className="text-[hsl(240_10%_70%)]">
                                      Deposits: <span className="text-[hsl(145_70%_60%)]">+{fmt(u.deposits)}</span>
                                      {' '} + Internal In: <span className="text-[hsl(145_70%_60%)]">+{fmt(u.internal_in)}</span>
                                      {' '} + Buys: <span className="text-[hsl(145_70%_60%)]">+{fmt(u.trade_buys)}</span>
                                    </p>
                                    <p className="text-[hsl(240_10%_70%)]">
                                      Withdrawals: <span className="text-[hsl(0_70%_68%)]">-{fmt(u.withdrawals)}</span>
                                      {' '} + Internal Out: <span className="text-[hsl(0_70%_68%)]">-{fmt(u.internal_out)}</span>
                                      {' '} + Sells: <span className="text-[hsl(0_70%_68%)]">-{fmt(u.trade_sells)}</span>
                                      {' '} + Fees: <span className="text-[hsl(45_100%_60%)]">-{fmt(u.fees_paid)}</span>
                                    </p>
                                    <div className="border-t border-[hsl(235_20%_22%)] my-1" />
                                    <p className="text-[hsl(240_10%_70%)]">
                                      Expected: <span className="text-[hsl(0_0%_98%)] font-bold">
                                        {fmt((u.deposits + u.internal_in + u.trade_buys) - (u.withdrawals + u.internal_out + u.trade_sells + u.fees_paid))}
                                      </span>
                                      {' '} | Actual: <span className="text-[hsl(0_0%_98%)] font-bold">{fmt(u.total)}</span>
                                      {' '} | Ledger: <span className="text-[hsl(0_0%_98%)] font-bold">{fmt(u.ledger_net)}</span>
                                    </p>
                                    {hasGhostLock && (
                                      <p className="text-[hsl(0_70%_68%)] mt-1">
                                        👻 Ghost Lock Detected: {fmt(u.locked)} locked with {u.active_orders} active orders (expected locked from orders: {fmt(u.active_order_locked)})
                                      </p>
                                    )}
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                    <Button size="sm" variant="outline"
                                      disabled={fixingUser === u.user_id}
                                      onClick={() => handleFixUser(u.user_id)}
                                      className="h-7 px-3 text-xs border-[hsl(45_100%_50%/0.5)] text-[hsl(45_100%_60%)] hover:bg-[hsl(45_100%_50%/0.1)]">
                                      <Wrench className="h-3.5 w-3.5 mr-1" />
                                      {fixingUser === u.user_id ? 'Fixing...' : 'Force Reconcile'}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length > 200 && (
                    <p className="text-center text-xs text-[hsl(240_10%_50%)] py-2">Showing 200 of {filteredUsers.length} users</p>
                  )}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ SECTION 4: Complete Transfer History ═══ */}
      <Collapsible open={expandedSections.transfers} onOpenChange={() => toggle('transfers')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5 text-[hsl(45_100%_60%)]" /> Complete Transfer History</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.transfers ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-[hsl(240_10%_50%)]" />
                  <Input
                    placeholder="Search email, user, tx hash..."
                    value={searchTransfer}
                    onChange={e => setSearchTransfer(e.target.value)}
                    className="pl-8 bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%)] text-[hsl(0_0%_98%)] text-sm h-9"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleExportTransfers}
                  className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>

              {transfersLoading ? (
                <p className="text-[hsl(240_10%_70%)]">Loading transfers...</p>
              ) : (
                <>
                {/* Mobile Card Layout */}
                <div className="md:hidden space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredTransfers.slice(0, 500).map(t => {
                    const isExpanded = expandedTransfers.has(t.id);
                    return (
                      <div
                        key={t.id}
                        className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%)] rounded-xl p-3 space-y-2"
                        onClick={() => toggleTransferExpand(t.id)}
                      >
                        {/* Primary row: Token, Amount, Direction */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[hsl(262_100%_65%)] font-bold text-sm">{t.asset_symbol}</span>
                            <Badge variant="outline" className={`text-[10px] ${
                              t.direction === 'to_trading'
                                ? 'border-[hsl(145_70%_50%/0.5)] text-[hsl(145_70%_60%)]'
                                : 'border-[hsl(0_70%_50%/0.5)] text-[hsl(0_70%_68%)]'
                            }`}>
                              {t.direction === 'to_trading' ? 'On-Chain → Trading' : 'Trading → On-Chain'}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="text-[hsl(0_0%_98%)] font-mono font-semibold text-sm">{fmt(t.amount)}</span>
                          </div>
                        </div>

                        {/* Secondary row: Date, Status */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[hsl(240_10%_60%)]">
                            {t.created_at ? format(new Date(t.created_at), 'dd MMM yyyy • HH:mm') : '-'}
                          </span>
                          <Badge className={`text-[10px] ${
                            t.status === 'completed' ? 'bg-[hsl(145_70%_20%)] text-[hsl(145_70%_60%)]' :
                            t.status === 'pending' ? 'bg-[hsl(45_100%_20%)] text-[hsl(45_100%_60%)]' :
                            'bg-[hsl(0_70%_20%)] text-[hsl(0_70%_68%)]'
                          }`}>
                            {t.status}
                          </Badge>
                        </div>

                        {/* User */}
                        <div className="text-xs text-[hsl(240_10%_70%)] truncate">
                          👤 {t.email}
                        </div>

                        {/* Expandable details */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-[hsl(235_20%_22%/0.5)] space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[hsl(240_10%_50%)]">Username</span>
                              <span className="text-[hsl(0_0%_98%)]">{t.username}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[hsl(240_10%_50%)]">Fee</span>
                              <span className="text-[hsl(45_100%_60%)] font-mono">{fmt(t.fee)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[hsl(240_10%_50%)]">Net Amount</span>
                              <span className="text-[hsl(0_0%_98%)] font-mono">{fmt(t.net_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[hsl(240_10%_50%)]">Balance After</span>
                              <span className="text-[hsl(240_10%_70%)] font-mono">{t.balance_after != null ? fmt(t.balance_after) : '-'}</span>
                            </div>
                            {t.tx_hash && (
                              <div className="flex justify-between">
                                <span className="text-[hsl(240_10%_50%)]">Tx Hash</span>
                                <a href={`https://bscscan.com/tx/${t.tx_hash}`} target="_blank" rel="noopener noreferrer"
                                  className="text-[hsl(262_100%_70%)] hover:underline font-mono" onClick={e => e.stopPropagation()}>
                                  {t.tx_hash.substring(0, 10)}…
                                </a>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-[hsl(240_10%_50%)]">Ref ID</span>
                              <span className="text-[hsl(240_10%_60%)] font-mono">{t.reference_id || t.id.substring(0, 8)}</span>
                            </div>
                          </div>
                        )}

                        {/* Expand hint */}
                        <div className="text-center">
                          <ChevronDown className={`inline h-3 w-3 text-[hsl(240_10%_40%)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    );
                  })}
                  {filteredTransfers.length > 500 && (
                    <p className="text-center text-xs text-[hsl(240_10%_50%)] py-2">Showing 500 of {filteredTransfers.length} transfers</p>
                  )}
                  {filteredTransfers.length === 0 && (
                    <p className="text-center text-xs text-[hsl(240_10%_50%)] py-8">No transfers found</p>
                  )}
                </div>

                {/* Desktop Table Layout */}
                <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-[hsl(235_28%_13%)] z-10">
                      <tr className="border-b border-[hsl(235_20%_22%)]">
                        <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Date (UTC)</th>
                        <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Email</th>
                        <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">User</th>
                        <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Direction</th>
                        <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Token</th>
                        <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Amount</th>
                        <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Fee</th>
                        <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Net</th>
                        <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Status</th>
                        <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Bal After</th>
                        <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Tx Hash</th>
                        <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Ref ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransfers.slice(0, 500).map(t => (
                        <tr key={t.id} className="border-b border-[hsl(235_20%_22%/0.3)] hover:bg-[hsl(235_28%_18%)]">
                          <td className="py-1.5 px-1 text-[hsl(240_10%_70%)] whitespace-nowrap">
                            {t.created_at ? format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss') : '-'}
                          </td>
                          <td className="py-1.5 px-1 text-[hsl(240_10%_70%)] max-w-[140px] truncate">{t.email}</td>
                          <td className="py-1.5 px-1 text-[hsl(0_0%_98%)]">{t.username}</td>
                          <td className="py-1.5 px-1">
                            <Badge variant="outline" className={`text-xs whitespace-nowrap ${
                              t.direction === 'to_trading'
                                ? 'border-[hsl(145_70%_50%/0.5)] text-[hsl(145_70%_60%)]'
                                : 'border-[hsl(0_70%_50%/0.5)] text-[hsl(0_70%_68%)]'
                            }`}>
                              {t.direction === 'to_trading' ? 'On-Chain → Trading' : 'Trading → On-Chain'}
                            </Badge>
                          </td>
                          <td className="py-1.5 px-1 text-[hsl(262_100%_65%)] font-semibold">{t.asset_symbol}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(0_0%_98%)] font-mono">{fmt(t.amount)}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(45_100%_60%)] font-mono">{fmt(t.fee)}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(0_0%_98%)] font-mono">{fmt(t.net_amount)}</td>
                          <td className="py-1.5 px-1">
                            <Badge className={`text-xs ${
                              t.status === 'completed' ? 'bg-[hsl(145_70%_20%)] text-[hsl(145_70%_60%)]' :
                              t.status === 'pending' ? 'bg-[hsl(45_100%_20%)] text-[hsl(45_100%_60%)]' :
                              'bg-[hsl(0_70%_20%)] text-[hsl(0_70%_68%)]'
                            }`}>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="text-right py-1.5 px-1 text-[hsl(240_10%_70%)] font-mono">
                            {t.balance_after != null ? fmt(t.balance_after) : '-'}
                          </td>
                          <td className="py-1.5 px-1 text-[hsl(240_10%_50%)] font-mono max-w-[100px] truncate">
                            {t.tx_hash ? (
                              <a href={`https://bscscan.com/tx/${t.tx_hash}`} target="_blank" rel="noopener noreferrer"
                                className="text-[hsl(262_100%_70%)] hover:underline">
                                {t.tx_hash.substring(0, 10)}…
                              </a>
                            ) : '-'}
                          </td>
                          <td className="py-1.5 px-1 text-[hsl(240_10%_50%)] font-mono max-w-[80px] truncate">
                            {t.reference_id || t.id.substring(0, 8)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredTransfers.length > 500 && (
                    <p className="text-center text-xs text-[hsl(240_10%_50%)] py-2">Showing 500 of {filteredTransfers.length} transfers</p>
                  )}
                  {filteredTransfers.length === 0 && (
                    <p className="text-center text-xs text-[hsl(240_10%_50%)] py-8">No transfers found</p>
                  )}
                </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ SECTION 5: Hot Wallet Transparency ═══ */}
      <Collapsible open={expandedSections.hotwallet} onOpenChange={() => toggle('hotwallet')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Wallet className="h-5 w-5 text-[hsl(45_100%_60%)]" /> Hot Wallet Transparency</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.hotwallet ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {hotWalletLoading ? (
                <p className="text-[hsl(240_10%_70%)]">Loading...</p>
              ) : (
                <>
                  {/* Wallet address */}
                  {hotWalletData?.address && (
                    <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                      <p className="text-xs text-[hsl(240_10%_50%)] mb-1">Trading Hot Wallet Address</p>
                      <p className="font-mono text-sm text-[hsl(0_0%_98%)] break-all">{hotWalletData.address}</p>
                    </div>
                  )}

                  {/* Export */}
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleExportHotWallet}
                      className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
                      <Download className="h-4 w-4 mr-1" /> CSV
                    </Button>
                  </div>

                  {/* Token-wise breakdown table */}
                  {/* Mobile Card Layout for Hot Wallet */}
                  <div className="md:hidden space-y-3">
                    {(hotWalletData?.flows || []).map(f => {
                      const totalIn = f.total_deposits + f.total_internal_in;
                      const totalOut = f.total_withdrawals + f.total_internal_out;
                      return (
                        <div key={f.asset_symbol} className="bg-[hsl(235_28%_13%)] border border-[hsl(235_20%_22%)] rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[hsl(0_0%_98%)] font-bold text-sm">{f.asset_symbol}</span>
                            <span className="text-[hsl(0_0%_98%)] font-bold font-mono text-sm">{fmt(f.net_balance)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-[hsl(145_70%_20%/0.15)] rounded-lg p-2">
                              <p className="text-[hsl(240_10%_50%)] text-[10px]">Total Inflows</p>
                              <p className="text-[hsl(145_70%_60%)] font-mono font-semibold">{fmt(totalIn)}</p>
                              <p className="text-[hsl(240_10%_40%)] text-[10px]">Deposits: {fmt(f.total_deposits)} ({f.deposit_count})</p>
                              <p className="text-[hsl(240_10%_40%)] text-[10px]">Internal: {fmt(f.total_internal_in)} ({f.internal_in_count})</p>
                            </div>
                            <div className="bg-[hsl(0_70%_20%/0.15)] rounded-lg p-2">
                              <p className="text-[hsl(240_10%_50%)] text-[10px]">Total Outflows</p>
                              <p className="text-[hsl(0_70%_68%)] font-mono font-semibold">{fmt(totalOut)}</p>
                              <p className="text-[hsl(240_10%_40%)] text-[10px]">Withdrawals: {fmt(f.total_withdrawals)} ({f.withdrawal_count})</p>
                              <p className="text-[hsl(240_10%_40%)] text-[10px]">Internal: {fmt(f.total_internal_out)} ({f.internal_out_count})</p>
                            </div>
                          </div>
                          <div className="flex justify-between text-xs pt-1 border-t border-[hsl(235_20%_22%/0.3)]">
                            <span className="text-[hsl(240_10%_50%)]">Fees Collected</span>
                            <span className="text-[hsl(45_100%_60%)] font-mono">{fmt(f.total_fees_collected)}</span>
                          </div>
                        </div>
                      );
                    })}
                    {/* Mobile totals */}
                    {(hotWalletData?.flows || []).length > 0 && (
                      <div className="bg-[hsl(262_100%_25%/0.2)] border border-[hsl(262_100%_65%/0.3)] rounded-xl p-3 space-y-1.5">
                        <p className="text-[hsl(262_100%_65%)] font-bold text-xs">TOTALS</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-[hsl(240_10%_50%)]">Inflows</span>
                          <span className="text-[hsl(145_70%_60%)] font-mono font-bold">{fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_deposits + f.total_internal_in, 0))}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[hsl(240_10%_50%)]">Outflows</span>
                          <span className="text-[hsl(0_70%_68%)] font-mono font-bold">{fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_withdrawals + f.total_internal_out, 0))}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-[hsl(240_10%_50%)]">Fees</span>
                          <span className="text-[hsl(45_100%_60%)] font-mono font-bold">{fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_fees_collected, 0))}</span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-[hsl(262_100%_65%/0.3)]">
                          <span className="text-[hsl(0_0%_98%)]">Net Balance</span>
                          <span className="text-[hsl(0_0%_98%)] font-mono font-bold">{fmt(hotWalletData!.flows.reduce((s, f) => s + f.net_balance, 0))}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Desktop Table Layout for Hot Wallet */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[hsl(235_20%_22%)]">
                          <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">Token</th>
                          <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">User Deposits</th>
                          <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Internal In</th>
                          <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Total Inflows</th>
                          <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Withdrawals</th>
                          <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Internal Out</th>
                          <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Total Outflows</th>
                          <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Fees</th>
                          <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Net Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(hotWalletData?.flows || []).map(f => {
                          const totalIn = f.total_deposits + f.total_internal_in;
                          const totalOut = f.total_withdrawals + f.total_internal_out;
                          return (
                            <tr key={f.asset_symbol} className="border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)]">
                              <td className="py-2 font-semibold text-[hsl(0_0%_98%)]">{f.asset_symbol}</td>
                              <td className="text-right py-2 text-[hsl(145_70%_60%)]">{fmt(f.total_deposits)} <span className="text-[hsl(240_10%_50%)]">({f.deposit_count})</span></td>
                              <td className="text-right py-2 text-[hsl(145_70%_60%)]">{fmt(f.total_internal_in)} <span className="text-[hsl(240_10%_50%)]">({f.internal_in_count})</span></td>
                              <td className="text-right py-2 text-[hsl(145_70%_60%)] font-semibold">{fmt(totalIn)}</td>
                              <td className="text-right py-2 text-[hsl(0_70%_68%)]">{fmt(f.total_withdrawals)} <span className="text-[hsl(240_10%_50%)]">({f.withdrawal_count})</span></td>
                              <td className="text-right py-2 text-[hsl(0_70%_68%)]">{fmt(f.total_internal_out)} <span className="text-[hsl(240_10%_50%)]">({f.internal_out_count})</span></td>
                              <td className="text-right py-2 text-[hsl(0_70%_68%)] font-semibold">{fmt(totalOut)}</td>
                              <td className="text-right py-2 text-[hsl(45_100%_60%)]">{fmt(f.total_fees_collected)}</td>
                              <td className="text-right py-2 text-[hsl(0_0%_98%)] font-bold">{fmt(f.net_balance)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {(hotWalletData?.flows || []).length > 0 && (
                        <tfoot>
                          <tr className="border-t-2 border-[hsl(262_100%_65%/0.5)]">
                            <td className="py-2 font-bold text-[hsl(262_100%_65%)]">TOTAL</td>
                            <td className="text-right py-2 text-[hsl(145_70%_60%)] font-bold">
                              {fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_deposits, 0))}
                            </td>
                            <td className="text-right py-2 text-[hsl(145_70%_60%)] font-bold">
                              {fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_internal_in, 0))}
                            </td>
                            <td className="text-right py-2 text-[hsl(145_70%_60%)] font-bold">
                              {fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_deposits + f.total_internal_in, 0))}
                            </td>
                            <td className="text-right py-2 text-[hsl(0_70%_68%)] font-bold">
                              {fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_withdrawals, 0))}
                            </td>
                            <td className="text-right py-2 text-[hsl(0_70%_68%)] font-bold">
                              {fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_internal_out, 0))}
                            </td>
                            <td className="text-right py-2 text-[hsl(0_70%_68%)] font-bold">
                              {fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_withdrawals + f.total_internal_out, 0))}
                            </td>
                            <td className="text-right py-2 text-[hsl(45_100%_60%)] font-bold">
                              {fmt(hotWalletData!.flows.reduce((s, f) => s + f.total_fees_collected, 0))}
                            </td>
                            <td className="text-right py-2 text-[hsl(0_0%_98%)] font-bold">
                              {fmt(hotWalletData!.flows.reduce((s, f) => s + f.net_balance, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>

                  {/* Reconciliation proof */}
                  {(hotWalletData?.flows || []).length > 0 && (() => {
                    const grandIn = hotWalletData!.flows.reduce((s, f) => s + f.total_deposits + f.total_internal_in, 0);
                    const grandOut = hotWalletData!.flows.reduce((s, f) => s + f.total_withdrawals + f.total_internal_out, 0);
                    const grandFees = hotWalletData!.flows.reduce((s, f) => s + f.total_fees_collected, 0);
                    return (
                      <div className="bg-[hsl(235_28%_12%)] rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-[hsl(262_100%_65%)] mb-2">🔒 Hot Wallet Reconciliation Proof</h4>
                        <div className="space-y-1 text-sm font-mono">
                          <p className="text-[hsl(240_10%_70%)]">Total Inflows (deposits + internal in): <span className="text-[hsl(145_70%_60%)]">{fmt(grandIn)}</span></p>
                          <p className="text-[hsl(240_10%_70%)]">Total Outflows (withdrawals + internal out): <span className="text-[hsl(0_70%_68%)]">-{fmt(grandOut)}</span></p>
                          <p className="text-[hsl(240_10%_70%)]">Total Fees Collected: <span className="text-[hsl(45_100%_60%)]">{fmt(grandFees)}</span></p>
                          <div className="border-t border-[hsl(235_20%_22%)] my-1" />
                          <p className="text-[hsl(240_10%_70%)]">Net Remaining: <span className="text-[hsl(0_0%_98%)] font-bold">{fmt(grandIn - grandOut)}</span></p>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
