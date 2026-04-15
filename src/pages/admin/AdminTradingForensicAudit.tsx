import React, { useState } from 'react';
import { useForensicTokenReport, useForensicUserDrift, useCircuitBreakerEvents, useDailySnapshots } from '@/hooks/useForensicTradingReconciliation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, AlertTriangle, CheckCircle2, Shield, ChevronDown, Download, Zap, History, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

function fmt(n: number, decimals = 4): string {
  return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) { toast.error('No data to export'); return; }
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  link.click();
}

function DriftBadge({ drift, threshold = 0.01 }: { drift: number; threshold?: number }) {
  if (Math.abs(drift) <= threshold) return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">✓ Clean</Badge>;
  if (drift > 0) return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">⚠ +{fmt(drift)} INFLATED</Badge>;
  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">⚠ {fmt(drift)} DEFICIT</Badge>;
}

export default function AdminTradingForensicAudit() {
  const { data: tokenReport, isLoading: tokensLoading, refetch: refetchTokens } = useForensicTokenReport();
  const { data: cbEvents } = useCircuitBreakerEvents();
  const { data: snapshots } = useDailySnapshots();
  const [selectedToken, setSelectedToken] = useState<string | undefined>();
  const { data: userDrift, isLoading: usersLoading } = useForensicUserDrift(selectedToken);
  const [isRunning, setIsRunning] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [sections, setSections] = useState<Record<string, boolean>>({ summary: true, tokens: true, users: true, history: false, cb: false });
  const toggle = (key: string) => setSections(p => ({ ...p, [key]: !p[key] }));

  const handleRunReconciliation = async () => {
    setIsRunning(true);
    try {
      const { data, error } = await supabase.rpc('run_daily_trading_reconciliation' as any);
      if (error) throw error;
      toast.success('Reconciliation snapshot saved');
      refetchTokens();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const hasAnyDrift = (tokenReport || []).some(t => Math.abs(t.total_drift) > 0.01);
  const totalUserLiability = (tokenReport || []).reduce((s, t) => s + t.user_liability, 0);
  const totalFeesCollected = (tokenReport || []).reduce((s, t) => s + t.total_fee_credits, 0);
  const totalDriftTokens = (tokenReport || []).filter(t => Math.abs(t.total_drift) > 0.01).length;

  const filteredUsers = (userDrift || []).filter(u =>
    Math.abs(u.drift) > 0.001 || !searchUser ? true : false
  ).filter(u =>
    !searchUser ||
    u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.user_id.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)]">🔬 Forensic Trading Audit</h1>
          <p className="text-sm text-[hsl(240_10%_70%)]">Token-by-token proof-backed reconciliation with circuit breakers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetchTokens()} className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" onClick={handleRunReconciliation} disabled={isRunning} className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_55%)] text-white">
            <Shield className="h-4 w-4 mr-1" />{isRunning ? 'Running...' : 'Run Reconciliation'}
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      {hasAnyDrift ? (
        <div className="bg-[hsl(0_70%_20%/0.3)] border border-[hsl(0_70%_50%/0.5)] rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-[hsl(0_70%_68%)] shrink-0" />
          <div>
            <p className="font-semibold text-[hsl(0_70%_68%)]">⚠️ Ledger-Balance Drift Detected — {totalDriftTokens} token(s)</p>
            <p className="text-sm text-[hsl(0_70%_80%)]">Balance table does not match ledger truth. Some users have inflated or missing balances.</p>
          </div>
        </div>
      ) : !tokensLoading && (
        <div className="bg-[hsl(145_70%_20%/0.3)] border border-[hsl(145_70%_50%/0.5)] rounded-lg p-4 flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-[hsl(145_70%_60%)] shrink-0" />
          <div>
            <p className="font-semibold text-[hsl(145_70%_60%)]">✅ All Tokens Reconciled</p>
            <p className="text-sm text-[hsl(145_70%_80%)]">Ledger truth matches balance table for every token.</p>
          </div>
        </div>
      )}

      {/* ═══ GLOBAL SUMMARY ═══ */}
      <Collapsible open={sections.summary} onOpenChange={() => toggle('summary')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Shield className="h-5 w-5 text-[hsl(262_100%_65%)]" /> Global Summary</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${sections.summary ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Active Tokens</span>
                  <p className="text-xl font-bold text-[hsl(0_0%_98%)]">{tokenReport?.length || 0}</p>
                </div>
                <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Tokens with Drift</span>
                  <p className="text-xl font-bold text-[hsl(0_70%_68%)]">{totalDriftTokens}</p>
                </div>
                <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Total Ledger Entries</span>
                  <p className="text-xl font-bold text-[hsl(0_0%_98%)]">{(tokenReport || []).reduce((s, t) => s + t.ledger_entry_count, 0).toLocaleString()}</p>
                </div>
                <div className="bg-[hsl(235_28%_12%)] rounded-lg p-3">
                  <span className="text-xs text-[hsl(240_10%_70%)]">Platform Fees Collected</span>
                  <p className="text-xl font-bold text-[hsl(145_70%_60%)]">${fmt(totalFeesCollected, 2)}</p>
                </div>
              </div>

              {/* Reconciliation Formulas */}
              <div className="bg-[hsl(235_28%_12%)] border border-[hsl(235_20%_22%)] rounded-lg p-3 mt-4 text-xs font-mono">
                <p className="text-[hsl(262_100%_65%)] font-semibold mb-2 font-sans">Reconciliation Formulas</p>
                <p className="text-[hsl(240_10%_70%)]">LEDGER_TRUTH = Σ(delta_available) + Σ(delta_locked) per user per token</p>
                <p className="text-[hsl(240_10%_70%)]">TABLE_STATE = wallet_balances.available + wallet_balances.locked per user per token</p>
                <p className="text-[hsl(45_100%_60%)]">DRIFT = TABLE_STATE − LEDGER_TRUTH (positive = inflated balance = risk)</p>
                <p className="text-[hsl(240_10%_70%)] mt-2">HOT_WALLET_SHOULD_HOLD ≥ USER_LIABILITY + PENDING_WD + PLATFORM_FEES</p>
                <p className="text-[hsl(240_10%_70%)]">SOLVENCY_PROOF = ONCHAIN_BALANCE ≥ HOT_WALLET_SHOULD_HOLD</p>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ TOKEN-BY-TOKEN FORENSIC REPORT ═══ */}
      <Collapsible open={sections.tokens} onOpenChange={() => toggle('tokens')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Zap className="h-5 w-5 text-[hsl(45_100%_60%)]" /> Token Forensic Reports</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); exportCSV((tokenReport || []).map(t => ({ ...t })), 'forensic-token-report'); }}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <ChevronDown className={`h-5 w-5 transition-transform ${sections.tokens ? 'rotate-180' : ''}`} />
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {tokensLoading ? <p className="text-[hsl(240_10%_70%)]">Loading...</p> : (tokenReport || []).map(t => (
                <div key={t.asset_symbol} className="bg-[hsl(235_28%_12%)] border border-[hsl(235_20%_22%)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[hsl(0_0%_98%)]">{t.asset_symbol}</span>
                      <DriftBadge drift={t.total_drift} />
                      <Badge variant="outline" className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">{t.user_count} users</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setSelectedToken(t.asset_symbol)} className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
                      <Search className="h-3 w-3 mr-1" /> User Drill-Down
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {/* Inflows */}
                    <div>
                      <p className="text-[hsl(145_70%_60%)] font-semibold mb-1">📥 Inflows</p>
                      <p className="text-[hsl(240_10%_70%)]">Deposits: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_deposits)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Internal In: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_internal_in)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Refunds: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_refunds)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Adj In: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_adjustments_in)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Opening Bal: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_opening_balance)}</span></p>
                    </div>
                    {/* Trading */}
                    <div>
                      <p className="text-[hsl(45_100%_60%)] font-semibold mb-1">🔄 Trading</p>
                      <p className="text-[hsl(240_10%_70%)]">Fill Credits: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_fill_credits)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Fill Debits: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_fill_debits)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Order Locks: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_order_locks)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Order Cancels: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_order_cancels)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Fee Credits: <span className="text-[hsl(145_70%_60%)]">{fmt(t.total_fee_credits)}</span></p>
                    </div>
                    {/* Outflows */}
                    <div>
                      <p className="text-[hsl(0_70%_68%)] font-semibold mb-1">📤 Outflows</p>
                      <p className="text-[hsl(240_10%_70%)]">Withdrawals: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_withdrawals)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">WD Queued: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_withdrawal_queued)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Internal Out: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_internal_out)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Adj Out: <span className="text-[hsl(0_0%_98%)]">{fmt(t.total_adjustments_out)}</span></p>
                    </div>
                    {/* State & Drift */}
                    <div>
                      <p className="text-[hsl(262_100%_65%)] font-semibold mb-1">📊 Current State</p>
                      <p className="text-[hsl(240_10%_70%)]">Ledger Net: <span className="text-[hsl(0_0%_98%)]">{fmt(t.ledger_net_total)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Table Total: <span className="text-[hsl(0_0%_98%)]">{fmt(t.table_user_total)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Platform Fees: <span className="text-[hsl(145_70%_60%)]">{fmt(t.platform_fee_balance)}</span></p>
                      <p className="text-[hsl(240_10%_70%)]">Pending WD: <span className="text-[hsl(45_100%_60%)]">{fmt(t.pending_withdrawals)}</span></p>
                      <p className={`font-bold ${Math.abs(t.total_drift) > 0.01 ? 'text-[hsl(0_70%_68%)]' : 'text-[hsl(145_70%_60%)]'}`}>
                        Drift: {t.total_drift > 0 ? '+' : ''}{fmt(t.total_drift)}
                      </p>
                    </div>
                  </div>

                  {/* Solvency Proof */}
                  <div className="mt-3 bg-[hsl(235_28%_10%)] rounded p-2 text-xs font-mono">
                    <span className="text-[hsl(262_100%_65%)]">SOLVENCY:</span>
                    <span className="text-[hsl(240_10%_70%)]"> HW should hold ≥ </span>
                    <span className="text-[hsl(0_0%_98%)]">{fmt(t.hot_wallet_should_hold)}</span>
                    <span className="text-[hsl(240_10%_70%)]"> ({fmt(t.user_liability)} liability + {fmt(t.pending_withdrawals)} pending + {fmt(t.platform_fee_balance)} fees)</span>
                  </div>

                  {t.discrepancy_user_count > 0 && (
                    <p className="mt-2 text-xs text-[hsl(0_70%_68%)]">
                      ⚠ {t.discrepancy_user_count} user(s) with ledger-vs-table drift
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ USER DRIFT DRILL-DOWN ═══ */}
      <Collapsible open={sections.users} onOpenChange={() => toggle('users')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Search className="h-5 w-5 text-[hsl(262_100%_65%)]" /> User Drift Report</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${sections.users ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="flex gap-2 mb-4 flex-wrap">
                <Select value={selectedToken} onValueChange={setSelectedToken}>
                  <SelectTrigger className="w-40 bg-[hsl(235_28%_12%)] border-[hsl(235_20%_22%)] text-[hsl(0_0%_98%)]">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tokenReport || []).map(t => (
                      <SelectItem key={t.asset_symbol} value={t.asset_symbol}>
                        {t.asset_symbol} {Math.abs(t.total_drift) > 0.01 ? '⚠️' : '✅'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Search user..." value={searchUser} onChange={e => setSearchUser(e.target.value)}
                  className="w-60 bg-[hsl(235_28%_12%)] border-[hsl(235_20%_22%)] text-[hsl(0_0%_98%)]" />
                <Button variant="ghost" size="sm" onClick={() => exportCSV(filteredUsers, `user-drift-${selectedToken}`)}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
              </div>

              {!selectedToken ? (
                <p className="text-[hsl(240_10%_70%)] text-sm">Select a token above to view per-user drift analysis.</p>
              ) : usersLoading ? (
                <p className="text-[hsl(240_10%_70%)]">Loading...</p>
              ) : (
                <>
                  <p className="text-xs text-[hsl(240_10%_70%)] mb-2">
                    {filteredUsers.length} users • {filteredUsers.filter(u => Math.abs(u.drift) > 0.001).length} with drift
                  </p>
                  <div className="max-h-96 overflow-y-auto space-y-1">
                    {filteredUsers.filter(u => Math.abs(u.drift) > 0.001).map(u => (
                      <div key={u.user_id} className="bg-[hsl(235_28%_12%)] rounded p-2 flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="text-[hsl(0_0%_98%)] font-medium truncate">{u.username} <span className="text-[hsl(240_10%_70%)]">({u.email})</span></p>
                          <p className="text-[hsl(240_10%_70%)] font-mono text-[10px]">{u.user_id}</p>
                        </div>
                        <div className="text-right ml-2 shrink-0">
                          <p className="text-[hsl(240_10%_70%)]">Table: <span className="text-[hsl(0_0%_98%)]">{fmt(u.table_total)}</span></p>
                          <p className="text-[hsl(240_10%_70%)]">Ledger: <span className="text-[hsl(0_0%_98%)]">{fmt(u.ledger_total)}</span></p>
                        </div>
                        <div className="ml-3 shrink-0">
                          <DriftBadge drift={u.drift} threshold={0.001} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ DAILY HISTORY ═══ */}
      <Collapsible open={sections.history} onOpenChange={() => toggle('history')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><History className="h-5 w-5 text-[hsl(262_100%_65%)]" /> Daily Snapshots</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${sections.history ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {!snapshots?.length ? (
                <p className="text-[hsl(240_10%_70%)] text-sm">No snapshots yet. Run reconciliation to generate the first one.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {snapshots.map(s => (
                    <div key={s.id} className="bg-[hsl(235_28%_12%)] rounded p-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[hsl(0_0%_98%)] font-medium">{s.asset_symbol}</span>
                        <span className="text-[hsl(240_10%_70%)] ml-2">{s.run_date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[hsl(240_10%_70%)]">{s.discrepancy_user_count} users</span>
                        <DriftBadge drift={s.total_drift} />
                        {s.circuit_breaker_triggered && <Badge className="bg-red-500/20 text-red-400">🚨 CB</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ CIRCUIT BREAKER ═══ */}
      <Collapsible open={sections.cb} onOpenChange={() => toggle('cb')}>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-[hsl(235_28%_18%)] transition-colors pb-3">
              <CardTitle className="text-[hsl(0_0%_98%)] flex items-center justify-between">
                <span className="flex items-center gap-2"><Zap className="h-5 w-5 text-[hsl(0_70%_68%)]" /> Circuit Breaker Events</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${sections.cb ? 'rotate-180' : ''}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="bg-[hsl(235_28%_12%)] border border-[hsl(235_20%_22%)] rounded-lg p-3 mb-4 text-xs">
                <p className="text-[hsl(0_70%_68%)] font-semibold">Circuit Breaker Rule</p>
                <p className="text-[hsl(240_10%_70%)]">If any token's total drift exceeds 500 units, withdrawals are auto-frozen and admin is alerted.</p>
              </div>
              {!cbEvents?.length ? (
                <p className="text-[hsl(145_70%_60%)] text-sm">✅ No circuit breaker events — system is healthy.</p>
              ) : (
                <div className="space-y-1">
                  {cbEvents.map(e => (
                    <div key={e.id} className="bg-[hsl(235_28%_12%)] rounded p-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[hsl(0_0%_98%)] font-medium">{e.asset_symbol}</span>
                        <span className="text-[hsl(0_70%_68%)] ml-2">Drift: {fmt(e.drift_amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.resolved ? <Badge className="bg-emerald-500/20 text-emerald-400">Resolved</Badge> : <Badge className="bg-red-500/20 text-red-400">Active</Badge>}
                        <span className="text-[hsl(240_10%_70%)]">{format(new Date(e.created_at), 'MMM d, HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ═══ FINAL CONCLUSION ═══ */}
      <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-[hsl(0_0%_98%)] flex items-center gap-2">
            <Shield className="h-5 w-5 text-[hsl(262_100%_65%)]" /> Audit Conclusion
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {tokensLoading ? <p className="text-[hsl(240_10%_70%)]">Computing...</p> : (
            <>
              {(tokenReport || []).map(t => {
                const clean = Math.abs(t.total_drift) <= 0.01;
                return (
                  <div key={t.asset_symbol} className="flex items-center gap-2">
                    <span className={clean ? 'text-[hsl(145_70%_60%)]' : 'text-[hsl(0_70%_68%)]'}>{clean ? '✅' : '❌'}</span>
                    <span className="text-[hsl(0_0%_98%)] font-medium">{t.asset_symbol}:</span>
                    <span className="text-[hsl(240_10%_70%)]">
                      {clean ? 'Fully reconciled' : `Drift of ${fmt(t.total_drift)} across ${t.discrepancy_user_count} users — balance table inflated vs ledger truth`}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-[hsl(235_20%_22%)] pt-2 mt-3">
                <p className="text-[hsl(240_10%_70%)]">
                  <span className="text-[hsl(262_100%_65%)] font-semibold">Fee Collection:</span> Fees are credited to platform account (00000000-0000-0000-0000-000000000001) via FEE_CREDIT ledger entries. They remain inside the hot wallet.
                </p>
                <p className="text-[hsl(240_10%_70%)] mt-1">
                  <span className="text-[hsl(262_100%_65%)] font-semibold">Root Cause of Drift:</span> Historical deposits/credits wrote to wallet_balances without corresponding ledger entries. The atomic sync RPC fix prevents future drift.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
