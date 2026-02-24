import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, Download, ChevronDown, Shield, Database, TrendingUp, Activity, Wallet, ArrowUpDown, AlertTriangle, CheckCircle2, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { generateTradingFullReportPDF } from '@/lib/generateTradingFullReportPDF';

function useFullTradingReport() {
  return useQuery({
    queryKey: ['trading-full-report'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('trading-full-report');
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });
}

function StatCard({ icon: Icon, label, value, sub, color = 'hsl(262 100% 65%)' }: { icon: any; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="text-xs text-[hsl(240_10%_70%)]">{label}</span>
        </div>
        <p className="text-lg font-bold text-[hsl(0_0%_98%)] truncate">{value}</p>
        {sub && <p className="text-xs text-[hsl(240_10%_50%)] mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function fmt(n: number, decimals = 4): string {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  link.click();
}

export default function AdminTradingFullReport() {
  const { data: report, isLoading, refetch, isRefetching } = useFullTradingReport();
  const [userSearch, setUserSearch] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    transfers: true,
    hotwallet: true,
    recovery: true,
    trading: true,
    reconciliation: true,
    users: false,
  });

  const toggle = (key: string) => setExpandedSections(p => ({ ...p, [key]: !p[key] }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-[hsl(262_100%_65%)]" />
      </div>
    );
  }

  if (!report) {
    return <div className="text-center py-8 text-[hsl(240_10%_70%)]">Failed to load report</div>;
  }

  const hotWallet = report.hot_wallet || {};
  const recon = report.reconciliation || [];
  const hasDiscrepancy = recon.some((r: any) => r.status === 'MISMATCH');
  const recovery = report.recovery || {};
  const tradingActivity = report.trading_activity || {};
  const userSummaries = (report.user_summaries || []).filter((u: any) =>
    !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleExportUsers = () => {
    const rows = (report.user_summaries || []).flatMap((u: any) =>
      u.assets.map((a: any) => ({
        username: u.username,
        asset: a.symbol,
        deposited: a.deposited,
        withdrawn: a.withdrawn,
        bought: a.bought,
        sold: a.sold,
        recovered: a.recovered,
        available: a.available,
        locked: a.locked,
        total_balance: a.total_balance,
      }))
    );
    exportCSV(rows, 'trading-user-report');
    toast.success('User report exported');
  };

  const handleExportReconciliation = () => {
    exportCSV(recon, 'trading-reconciliation');
    toast.success('Reconciliation exported');
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)]">Trading Full Report</h1>
          <p className="text-sm text-[hsl(240_10%_70%)]">
            Generated: {report.generated_at ? format(new Date(report.generated_at), 'PPpp') : 'N/A'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}
            className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { generateTradingFullReportPDF(report); toast.success('PDF downloaded'); }}
            className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_55%)] text-white">
            <FileText className="h-4 w-4 mr-1" /> Export PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportReconciliation}
            className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
            <Download className="h-4 w-4 mr-1" /> Export Recon
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportUsers}
            className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
            <Download className="h-4 w-4 mr-1" /> Export Users
          </Button>
        </div>
      </div>

      {/* Reconciliation Status Banner */}
      {hasDiscrepancy ? (
        <div className="bg-[hsl(0_70%_20%/0.3)] border border-[hsl(0_70%_50%/0.5)] rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-[hsl(0_70%_68%)] shrink-0" />
          <div>
            <p className="font-semibold text-[hsl(0_70%_68%)]">⚠️ Reconciliation Mismatch Detected</p>
            <p className="text-sm text-[hsl(0_70%_80%)]">Some assets have discrepancies between ledger and balances. See reconciliation section below.</p>
          </div>
        </div>
      ) : (
        <div className="bg-[hsl(145_70%_20%/0.3)] border border-[hsl(145_70%_50%/0.5)] rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-[hsl(145_70%_60%)] shrink-0" />
          <div>
            <p className="font-semibold text-[hsl(145_70%_60%)]">✅ All Systems Balanced</p>
            <p className="text-sm text-[hsl(145_70%_80%)]">All trading balances reconcile within tolerance across all assets.</p>
          </div>
        </div>
      )}

      {/* ===== SECTION 1: Internal Balance Transfers ===== */}
      <Collapsible open={expandedSections.transfers} onOpenChange={() => toggle('transfers')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><ArrowUpDown className="h-5 w-5 text-[hsl(262_100%_65%)]" /> 1️⃣ Trading Balance Transfers (Internal)</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.transfers ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={TrendingUp} label="On-Chain → Trading" value={fmt(report.internal_transfers?.to_trading?.total_amount)} sub={`${report.internal_transfers?.to_trading?.count || 0} transfers`} color="hsl(145 70% 60%)" />
                <StatCard icon={TrendingUp} label="Trading → On-Chain" value={fmt(report.internal_transfers?.to_wallet?.total_amount)} sub={`${report.internal_transfers?.to_wallet?.count || 0} transfers`} color="hsl(0 70% 68%)" />
                <StatCard icon={Activity} label="Transfer Fees (In)" value={fmt(report.internal_transfers?.to_trading?.total_fees)} color="hsl(45 100% 60%)" />
                <StatCard icon={Activity} label="Transfer Fees (Out)" value={fmt(report.internal_transfers?.to_wallet?.total_fees)} color="hsl(45 100% 60%)" />
              </div>

              {/* Recent transfers table */}
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[hsl(235_28%_13%)]">
                    <tr className="border-b border-[hsl(235_20%_22%)]">
                      <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Date</th>
                      <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">User</th>
                      <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Direction</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Amount</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Fee</th>
                      <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Ref ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.internal_transfers?.details || []).slice(0, 50).map((t: any) => (
                      <tr key={t.id} className="border-b border-[hsl(235_20%_22%/0.3)] hover:bg-[hsl(235_28%_18%)]">
                        <td className="py-1.5 px-1 text-[hsl(240_10%_70%)]">{t.created_at ? format(new Date(t.created_at), 'MM/dd HH:mm') : '-'}</td>
                        <td className="py-1.5 px-1 text-[hsl(0_0%_98%)]">{t.username}</td>
                        <td className="py-1.5 px-1">
                          <Badge variant="outline" className={`text-xs ${t.direction === 'to_trading' ? 'border-[hsl(145_70%_50%/0.5)] text-[hsl(145_70%_60%)]' : 'border-[hsl(0_70%_50%/0.5)] text-[hsl(0_70%_68%)]'}`}>
                            {t.direction === 'to_trading' ? '→ Trading' : '→ On-Chain'}
                          </Badge>
                        </td>
                        <td className="text-right py-1.5 px-1 text-[hsl(0_0%_98%)] font-mono">{fmt(t.amount)}</td>
                        <td className="text-right py-1.5 px-1 text-[hsl(45_100%_60%)] font-mono">{fmt(t.fee)}</td>
                        <td className="py-1.5 px-1 text-[hsl(240_10%_50%)] font-mono truncate max-w-[120px]">{t.reference_id || t.id?.substring(0, 8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ===== SECTION 2: Hot Wallet Movement ===== */}
      <Collapsible open={expandedSections.hotwallet} onOpenChange={() => toggle('hotwallet')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Wallet className="h-5 w-5 text-[hsl(45_100%_60%)]" /> 2️⃣ Hot Wallet Movement</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.hotwallet ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3 mb-2">
                <p className="text-xs text-[hsl(240_10%_50%)] mb-1">Wallet Address</p>
                <p className="font-mono text-sm text-[hsl(0_0%_98%)] break-all">{hotWallet.address}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={TrendingUp} label="Total Deposits" value={fmt(hotWallet.total_custodial_deposits)} sub={`${hotWallet.deposit_count} txns`} color="hsl(145 70% 60%)" />
                <StatCard icon={TrendingUp} label="Total Withdrawals" value={fmt(hotWallet.total_custodial_withdrawals)} sub={`${hotWallet.withdrawal_count} txns`} color="hsl(0 70% 68%)" />
                <StatCard icon={Activity} label="Withdrawal Fees" value={fmt(hotWallet.total_withdrawal_fees)} color="hsl(45 100% 60%)" />
                <StatCard icon={Wallet} label="BNB Gas" value={`${fmt(hotWallet.bnb_gas, 6)} BNB`} color={hotWallet.bnb_gas < 0.01 ? 'hsl(0 70% 68%)' : 'hsl(145 70% 60%)'} />
              </div>

              {/* On-chain balances */}
              <h4 className="text-sm font-semibold text-[hsl(0_0%_98%)] mt-2">Current On-Chain Balances</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(hotWallet.on_chain_balances || {}).map(([token, balance]: [string, any]) => (
                  <div key={token} className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                    <p className="text-xs text-[hsl(240_10%_70%)]">{token}</p>
                    <p className="text-lg font-bold text-[hsl(0_0%_98%)] font-mono">{fmt(balance, 6)}</p>
                  </div>
                ))}
              </div>

              {/* Reconciliation proof */}
              <div className="bg-[hsl(235_28%_12%)] rounded-lg p-4 mt-2">
                <h4 className="text-sm font-semibold text-[hsl(262_100%_65%)] mb-2">🔒 Hot Wallet Reconciliation Proof</h4>
                <div className="space-y-1 text-sm font-mono">
                  <p className="text-[hsl(240_10%_70%)]">Total Deposits (credited):       <span className="text-[hsl(145_70%_60%)]">{fmt(hotWallet.total_custodial_deposits)}</span></p>
                  <p className="text-[hsl(240_10%_70%)]">Total Withdrawals (completed):   <span className="text-[hsl(0_70%_68%)]">-{fmt(hotWallet.total_custodial_withdrawals)}</span></p>
                  <div className="border-t border-[hsl(235_20%_22%)] my-1" />
                  <p className="text-[hsl(240_10%_70%)]">Expected Remaining:              <span className="text-[hsl(0_0%_98%)] font-bold">{fmt(hotWallet.total_custodial_deposits - hotWallet.total_custodial_withdrawals)}</span></p>
                  <p className="text-xs text-[hsl(240_10%_50%)] mt-1">
                    Note: On-chain balances include tokens across all assets. Expected remaining is the aggregate custodial net.
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ===== SECTION 3: Recovered Balances ===== */}
      <Collapsible open={expandedSections.recovery} onOpenChange={() => toggle('recovery')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Shield className="h-5 w-5 text-[hsl(145_70%_60%)]" /> 3️⃣ Recovered Trading Balances</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.recovery ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard icon={Shield} label="Total Recovery Entries" value={String(recovery.total_recovery_entries || 0)} color="hsl(145 70% 60%)" />
                {Object.entries(recovery.by_asset || {}).map(([sym, data]: [string, any]) => (
                  <StatCard key={sym} icon={Database} label={`${sym} Recovered`} value={fmt(data.total)} sub={`${data.count} entries`} color="hsl(262 100% 65%)" />
                ))}
              </div>

              {/* Recovery details */}
              {Object.entries(recovery.by_asset || {}).map(([sym, data]: [string, any]) => (
                <div key={sym}>
                  <h4 className="text-sm font-semibold text-[hsl(0_0%_98%)] mb-2">{sym} Recovery Details</h4>
                  <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-[hsl(235_28%_13%)]">
                        <tr className="border-b border-[hsl(235_20%_22%)]">
                          <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Date</th>
                          <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">User</th>
                          <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Amount</th>
                          <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Type</th>
                          <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data.entries || []).map((e: any, i: number) => (
                          <tr key={i} className="border-b border-[hsl(235_20%_22%/0.3)]">
                            <td className="py-1.5 px-1 text-[hsl(240_10%_70%)]">{e.date ? format(new Date(e.date), 'MM/dd HH:mm') : '-'}</td>
                            <td className="py-1.5 px-1 text-[hsl(0_0%_98%)]">{e.username}</td>
                            <td className="text-right py-1.5 px-1 text-[hsl(145_70%_60%)] font-mono">{fmt(e.amount)}</td>
                            <td className="py-1.5 px-1">
                              <Badge variant="outline" className="text-xs border-[hsl(262_100%_65%/0.5)] text-[hsl(262_100%_65%)]">{e.type}</Badge>
                            </td>
                            <td className="py-1.5 px-1 text-[hsl(240_10%_50%)] truncate max-w-[200px]">{e.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ===== SECTION 4: Trading Activity ===== */}
      <Collapsible open={expandedSections.trading} onOpenChange={() => toggle('trading')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Activity className="h-5 w-5 text-[hsl(45_100%_60%)]" /> 4️⃣ Trading Activity Summary</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.trading ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <StatCard icon={Activity} label="Total Trades" value={String(tradingActivity.total_trades || 0)} color="hsl(262 100% 65%)" />

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(235_20%_22%)]">
                      <th className="text-left py-2 text-[hsl(240_10%_70%)]">Pair</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Trades</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Volume</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Value</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Buyer Fees</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Seller Fees</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Total Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(tradingActivity.by_pair || {}).map(([pair, d]: [string, any]) => (
                      <tr key={pair} className="border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)]">
                        <td className="py-2 font-semibold text-[hsl(262_100%_65%)]">{pair}</td>
                        <td className="text-right py-2 text-[hsl(0_0%_98%)]">{d.count}</td>
                        <td className="text-right py-2 text-[hsl(0_0%_98%)] font-mono">{fmt(d.volume)}</td>
                        <td className="text-right py-2 text-[hsl(0_0%_98%)] font-mono">{fmt(d.value)}</td>
                        <td className="text-right py-2 text-[hsl(45_100%_60%)] font-mono">{fmt(d.buyerFees)}</td>
                        <td className="text-right py-2 text-[hsl(45_100%_60%)] font-mono">{fmt(d.sellerFees)}</td>
                        <td className="text-right py-2 text-[hsl(262_100%_65%)] font-mono font-bold">{fmt(d.buyerFees + d.sellerFees)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Platform fee balances */}
              <h4 className="text-sm font-semibold text-[hsl(0_0%_98%)]">Platform Fee Wallet Balances</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(tradingActivity.total_fees_collected || {}).map(([sym, bal]: [string, any]) => (
                  <div key={sym} className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                    <p className="text-xs text-[hsl(240_10%_70%)]">{sym}</p>
                    <p className="text-lg font-bold text-[hsl(262_100%_65%)] font-mono">{fmt(bal)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ===== SECTION 5: Reconciliation Proof ===== */}
      <Collapsible open={expandedSections.reconciliation} onOpenChange={() => toggle('reconciliation')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Shield className="h-5 w-5 text-[hsl(262_100%_65%)]" /> 5️⃣ Reconciliation Proof</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.reconciliation ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[hsl(235_20%_22%)]">
                      <th className="text-left py-2 text-[hsl(240_10%_70%)]">Asset</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Total Deposits</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Total Withdrawals</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Expected</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">User Balances</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Platform Fees</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Actual</th>
                      <th className="text-right py-2 text-[hsl(240_10%_70%)]">Δ Discrepancy</th>
                      <th className="text-center py-2 text-[hsl(240_10%_70%)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recon.map((r: any) => (
                      <tr key={r.asset} className="border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)]">
                        <td className="py-2 font-semibold text-[hsl(0_0%_98%)]">{r.asset}</td>
                        <td className="text-right py-2 text-[hsl(145_70%_60%)] font-mono">{fmt(r.total_deposits)}</td>
                        <td className="text-right py-2 text-[hsl(0_70%_68%)] font-mono">{fmt(r.total_withdrawals)}</td>
                        <td className="text-right py-2 text-[hsl(0_0%_98%)] font-mono font-bold">{fmt(r.expected_balance)}</td>
                        <td className="text-right py-2 text-[hsl(0_0%_98%)] font-mono">{fmt(r.user_balances)}</td>
                        <td className="text-right py-2 text-[hsl(262_100%_65%)] font-mono">{fmt(r.platform_fees)}</td>
                        <td className="text-right py-2 text-[hsl(0_0%_98%)] font-mono font-bold">{fmt(r.actual_balance)}</td>
                        <td className="text-right py-2 font-mono font-bold">
                          <span className={Math.abs(r.discrepancy) > 0.01 ? 'text-[hsl(0_70%_68%)]' : 'text-[hsl(145_70%_60%)]'}>
                            {r.discrepancy > 0 ? '+' : ''}{fmt(r.discrepancy)}
                          </span>
                        </td>
                        <td className="text-center py-2">
                          <Badge className={`text-xs ${r.status === 'BALANCED' ? 'bg-[hsl(145_70%_20%)] text-[hsl(145_70%_60%)]' : 'bg-[hsl(0_70%_20%)] text-[hsl(0_70%_68%)]'}`}>
                            {r.status === 'BALANCED' ? '✓ OK' : '⚠ MISMATCH'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ledger breakdown */}
              <h4 className="text-sm font-semibold text-[hsl(0_0%_98%)] mt-4 mb-2">Ledger Entry Breakdown</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(report.ledger_breakdown || {}).map(([type, data]: [string, any]) => (
                  <Badge key={type} variant="outline" className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)] px-3 py-1">
                    {type}: <span className="ml-1 text-[hsl(0_0%_98%)] font-bold">{data.count}</span>
                    <span className="ml-1 text-[hsl(145_70%_60%)]">Δ{fmt(data.sum_available, 2)}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ===== SECTION 6: User-Level Summary ===== */}
      <Collapsible open={expandedSections.users} onOpenChange={() => toggle('users')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Database className="h-5 w-5 text-[hsl(262_100%_65%)]" /> 6️⃣ User-Level Summary ({report.total_users} users)</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${expandedSections.users ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-[hsl(240_10%_50%)]" />
                <Input
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-8 bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%)] text-[hsl(0_0%_98%)] text-sm h-9"
                />
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-[hsl(235_28%_13%)]">
                    <tr className="border-b border-[hsl(235_20%_22%)]">
                      <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">User</th>
                      <th className="text-left py-2 px-1 text-[hsl(240_10%_70%)]">Asset</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Deposited</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Withdrawn</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Bought</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Sold</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Recovered</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Available</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)]">Locked</th>
                      <th className="text-right py-2 px-1 text-[hsl(240_10%_70%)] font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userSummaries.slice(0, 100).flatMap((u: any) =>
                      u.assets.map((a: any, i: number) => (
                        <tr key={`${u.user_id}-${a.symbol}-${i}`} className="border-b border-[hsl(235_20%_22%/0.3)] hover:bg-[hsl(235_28%_18%)]">
                          {i === 0 ? (
                            <td className="py-1.5 px-1 text-[hsl(0_0%_98%)] font-mono" rowSpan={u.assets.length}>{u.username}</td>
                          ) : null}
                          <td className="py-1.5 px-1 text-[hsl(262_100%_65%)]">{a.symbol}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(145_70%_60%)] font-mono">{a.deposited > 0 ? fmt(a.deposited) : '-'}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(0_70%_68%)] font-mono">{a.withdrawn > 0 ? fmt(a.withdrawn) : '-'}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(0_0%_98%)] font-mono">{a.bought > 0 ? fmt(a.bought) : '-'}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(0_0%_98%)] font-mono">{a.sold > 0 ? fmt(a.sold) : '-'}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(262_100%_65%)] font-mono">{a.recovered > 0 ? fmt(a.recovered) : '-'}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(0_0%_98%)] font-mono">{fmt(a.available)}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(45_100%_60%)] font-mono">{a.locked > 0 ? fmt(a.locked) : '-'}</td>
                          <td className="text-right py-1.5 px-1 text-[hsl(0_0%_98%)] font-bold font-mono">{fmt(a.total_balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {userSummaries.length > 100 && (
                <p className="text-center text-xs text-[hsl(240_10%_50%)] py-2">
                  Showing 100 of {userSummaries.length} users. Export CSV for full data.
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
