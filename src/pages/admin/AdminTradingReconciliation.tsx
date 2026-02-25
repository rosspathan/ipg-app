import React, { useState } from 'react';
import { useGlobalReconciliation, useLedgerStats } from '@/hooks/useAdminTradingReconciliation';
import { useTransferHistory, useUserAuditWithEmail, useHotWalletTransparency } from '@/hooks/useAdminReconciliationReport';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, AlertTriangle, CheckCircle2, Search, Shield, Database, TrendingUp, Activity, ChevronDown, Download, Wallet, ArrowUpDown, FileText } from 'lucide-react';
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

  const filteredUsers = (userData || []).filter(u =>
    !searchUser ||
    u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchUser.toLowerCase())
  );

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
      ledger_net: u.ledger_net.toFixed(4),
      drift: u.drift.toFixed(4),
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
                  {ledgerStats.entry_types.map(et => (
                    <Badge key={et.entry_type} variant="outline" className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
                      {et.entry_type}: <span className="ml-1 text-[hsl(0_0%_98%)] font-bold">{et.count}</span>
                    </Badge>
                  ))}
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
              {globalLoading ? (
                <p className="text-[hsl(240_10%_70%)]">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(235_20%_22%)]">
                        <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">Asset</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Deposits</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Withdrawals</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Available</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Locked</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Fees</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Users</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(globalData || []).map(a => (
                        <tr key={a.asset_symbol} className="border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)]">
                          <td className="py-2 font-semibold text-[hsl(0_0%_98%)]">{a.asset_symbol}</td>
                          <td className="text-right py-2 text-[hsl(145_70%_60%)]">{fmt(a.total_deposits)}</td>
                          <td className="text-right py-2 text-[hsl(0_70%_68%)]">{fmt(a.total_withdrawals)}</td>
                          <td className="text-right py-2 text-[hsl(0_0%_98%)]">{fmt(a.total_user_available)}</td>
                          <td className="text-right py-2 text-[hsl(45_100%_60%)]">{fmt(a.total_user_locked)}</td>
                          <td className="text-right py-2 text-[hsl(262_100%_65%)]">{fmt(a.total_platform_fees)}</td>
                          <td className="text-right py-2 text-[hsl(240_10%_70%)]">{a.user_count}</td>
                          <td className="text-right py-2">
                            {Math.abs(a.discrepancy) > 0.01 ? (
                              <Badge className="bg-[hsl(0_70%_20%)] text-[hsl(0_70%_68%)] text-xs">Δ {a.discrepancy.toFixed(4)}</Badge>
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
                <div className="flex gap-2 w-full sm:w-auto">
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
                </div>
                <Button variant="outline" size="sm" onClick={handleExportUsers}
                  className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>

              {usersLoading ? (
                <p className="text-[hsl(240_10%_70%)]">Loading...</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[hsl(235_20%_22%)]">
                        <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">User</th>
                        <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">Email</th>
                        <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">Asset</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Available</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Locked</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Total</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Ledger</th>
                        <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Drift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.slice(0, 200).map((u, i) => (
                        <tr key={`${u.user_id}-${u.asset_symbol}-${i}`} className="border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)]">
                          <td className="py-2 text-[hsl(0_0%_98%)] font-mono text-xs">{u.username}</td>
                          <td className="py-2 text-[hsl(240_10%_70%)] text-xs max-w-[160px] truncate">{u.email}</td>
                          <td className="py-2 text-[hsl(262_100%_65%)]">{u.asset_symbol}</td>
                          <td className="text-right py-2 text-[hsl(0_0%_98%)]">{fmt(u.available)}</td>
                          <td className="text-right py-2 text-[hsl(45_100%_60%)]">{fmt(u.locked)}</td>
                          <td className="text-right py-2 text-[hsl(0_0%_98%)] font-semibold">{fmt(u.total)}</td>
                          <td className="text-right py-2 text-[hsl(240_10%_70%)]">{fmt(u.ledger_net)}</td>
                          <td className="text-right py-2">
                            {Math.abs(u.drift) > 0.00001 ? (
                              <span className="text-[hsl(0_70%_68%)] font-bold">{u.drift.toFixed(4)}</span>
                            ) : (
                              <span className="text-[hsl(145_70%_60%)]">0</span>
                            )}
                          </td>
                        </tr>
                      ))}
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
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
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
                  <div className="overflow-x-auto">
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
