import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useBSKForensicSummary, useBSKSourceBreakdown, useBSKTopHolders,
  useBSKUserBalances, useBSKMismatches, useBSKUserDetail,
  useBSKUserHistory, useBSKExport,
} from '@/hooks/useBSKForensicAudit';
import {
  AlertTriangle, CheckCircle2, Download, Eye, Search,
  TrendingUp, Users, Wallet, BarChart3, ShieldAlert,
  ChevronLeft, ChevronRight, ArrowUpDown, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

function fmtBSK(n: number | null | undefined) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function SummaryCards() {
  const { data, isLoading } = useBSKForensicSummary();
  if (isLoading) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (!data) return null;

  const bal = data.balance || {};
  const ledger = data.ledger || {};
  const conc = data.concentration || {};
  const mis = data.mismatch || {};

  const cards = [
    { label: 'Total Users', value: bal.total_users, icon: Users, color: 'text-blue-400' },
    { label: 'Holders (> 0)', value: bal.holders_positive, icon: Wallet, color: 'text-emerald-400' },
    { label: 'Total Tradable BSK', value: fmtBSK(bal.total_balance), icon: TrendingUp, color: 'text-amber-400', large: true },
    { label: 'Avg per Holder', value: fmtBSK(bal.avg_per_holder), icon: BarChart3, color: 'text-cyan-400' },
    { label: 'Lifetime Credits', value: fmtBSK(ledger.total_credits), icon: TrendingUp, color: 'text-green-400' },
    { label: 'Lifetime Debits', value: fmtBSK(ledger.total_debits), icon: TrendingUp, color: 'text-red-400' },
    { label: 'Net Outstanding (Ledger)', value: fmtBSK(ledger.net_outstanding), icon: Wallet, color: 'text-purple-400' },
    {
      label: 'Reconciliation',
      value: mis.mismatched_users === 0 ? '✓ Clean' : `${mis.mismatched_users} mismatched`,
      icon: mis.mismatched_users === 0 ? CheckCircle2 : AlertTriangle,
      color: mis.mismatched_users === 0 ? 'text-green-400' : 'text-red-400',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="bg-card/50 border-border/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <c.icon className={`h-4 w-4 ${c.color}`} />
                <span className="text-xs text-muted-foreground">{c.label}</span>
              </div>
              <p className={`text-lg font-bold font-mono ${c.color}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Concentration */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Balance Concentration</h4>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Top 1 User', pct: conc.top_1_pct },
              { label: 'Top 10 Users', pct: conc.top_10_pct },
              { label: 'Top 50 Users', pct: conc.top_50_pct },
            ].map((c, i) => (
              <div key={i}>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/30 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(c.pct || 0, 100)}%` }} />
                  </div>
                  <span className="text-sm font-mono font-bold">{c.pct}%</span>
                </div>
              </div>
            ))}
          </div>
          {bal.holders_zero > 0 && (
            <p className="text-xs text-muted-foreground mt-2">Zero-balance users: {bal.holders_zero} | Negative-balance users: {bal.holders_negative || 0}</p>
          )}
          {mis.total_abs_mismatch > 0 && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Total mismatch: {fmtBSK(mis.total_abs_mismatch)} BSK across {mis.mismatched_users} user(s)
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SourceBreakdownTab() {
  const { data, isLoading } = useBSKSourceBreakdown();
  if (isLoading) return <Skeleton className="h-64" />;
  if (!data || !Array.isArray(data)) return <p className="text-muted-foreground text-sm">No data</p>;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Source-wise Breakdown (Withdrawable BSK)</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Source</TableHead>
                <TableHead className="text-xs text-right">Credits</TableHead>
                <TableHead className="text-xs text-right">Debits</TableHead>
                <TableHead className="text-xs text-right">Net</TableHead>
                <TableHead className="text-xs text-right">Users</TableHead>
                <TableHead className="text-xs text-right">Txns</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-xs font-mono">
                    <Badge variant="outline" className="text-xs">
                      {row.tx_subtype || row.tx_type}
                    </Badge>
                    <span className="ml-1 text-muted-foreground">({row.tx_type})</span>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono text-green-400">{fmtBSK(row.total_credited)}</TableCell>
                  <TableCell className="text-xs text-right font-mono text-red-400">{fmtBSK(row.total_debited)}</TableCell>
                  <TableCell className={`text-xs text-right font-mono font-bold ${row.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmtBSK(row.net)}
                  </TableCell>
                  <TableCell className="text-xs text-right">{row.affected_users}</TableCell>
                  <TableCell className="text-xs text-right">{row.tx_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function TopHoldersTab() {
  const [limit, setLimit] = useState(50);
  const { data, isLoading } = useBSKTopHolders(limit);
  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Top Holders</CardTitle>
        <Select value={String(limit)} onValueChange={v => setLimit(Number(v))}>
          <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="10">Top 10</SelectItem>
            <SelectItem value="25">Top 25</SelectItem>
            <SelectItem value="50">Top 50</SelectItem>
            <SelectItem value="100">Top 100</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8">#</TableHead>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs text-right">Balance</TableHead>
                <TableHead className="text-xs text-right">% of Total</TableHead>
                <TableHead className="text-xs text-right">Total Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data || []).map((h: any) => (
                <TableRow key={h.user_id}>
                  <TableCell className="text-xs font-bold">{h.rank}</TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium">{h.username}</div>
                    <div className="text-muted-foreground text-[10px]">{h.email}</div>
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold text-amber-400">{fmtBSK(h.balance)}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{h.pct_of_total}%</TableCell>
                  <TableCell className="text-xs text-right font-mono text-muted-foreground">{fmtBSK(h.total_earned)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function AllUsersTab({ onSelectUser }: { onSelectUser: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('balance_desc');
  const pageSize = 25;

  const { data, isLoading } = useBSKUserBalances(page, pageSize, search, balanceFilter, sortBy);
  const { exportCSV } = useBSKExport();

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
          <CardTitle className="text-sm">All User Balances</CardTitle>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-2 text-muted-foreground" />
              <Input
                placeholder="Search user..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-7 h-8 text-xs w-44"
              />
            </div>
            <Select value={balanceFilter} onValueChange={v => { setBalanceFilter(v); setPage(1); }}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="zero">Zero</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => exportCSV(balanceFilter, search)}>
              <Download className="h-3 w-3 mr-1" /> Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48" /> : (
          <>
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs text-right cursor-pointer" onClick={() => setSortBy(sortBy === 'balance_desc' ? 'balance_asc' : 'balance_desc')}>
                      Balance <ArrowUpDown className="h-3 w-3 inline" />
                    </TableHead>
                    <TableHead className="text-xs text-right">Total Earned</TableHead>
                    <TableHead className="text-xs w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.users || []).map((u: any) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{u.username}</div>
                        <div className="text-muted-foreground text-[10px] truncate max-w-[200px]">{u.email}</div>
                      </TableCell>
                      <TableCell className={`text-xs text-right font-mono font-bold ${u.balance < 0 ? 'text-red-400' : u.balance === 0 ? 'text-muted-foreground' : 'text-amber-400'}`}>
                        {fmtBSK(u.balance)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground">{fmtBSK(u.total_earned)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSelectUser(u.user_id)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">Total: {data?.total || 0}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-xs px-2 py-1">Page {page}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={(data?.users?.length || 0) < pageSize} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MismatchesTab({ onSelectUser }: { onSelectUser: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useBSKMismatches(page, 25);

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400" /> Ledger ↔ Balance Mismatches
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-48" /> : (
          data?.mismatches?.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-green-400 font-semibold">All balances reconcile with ledger ✓</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs text-right">Balance</TableHead>
                      <TableHead className="text-xs text-right">Ledger Net</TableHead>
                      <TableHead className="text-xs text-right">Mismatch</TableHead>
                      <TableHead className="text-xs w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.mismatches || []).map((m: any) => (
                      <TableRow key={m.user_id}>
                        <TableCell className="text-xs">
                          <div className="font-medium">{m.username}</div>
                          <div className="text-muted-foreground text-[10px]">{m.email}</div>
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmtBSK(m.current_balance)}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{fmtBSK(m.ledger_net)}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-red-400">{fmtBSK(m.mismatch)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onSelectUser(m.user_id)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-2">Total mismatched: {data?.total || 0}</p>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}

function UserDetailDialog({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data: detail, isLoading: detailLoading } = useBSKUserDetail(userId);
  const [histPage, setHistPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState('');
  const { data: history, isLoading: histLoading } = useBSKUserHistory(userId, histPage, 20, sourceFilter);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-base">User BSK Audit Detail</DialogTitle>
        </DialogHeader>

        {detailLoading ? <Skeleton className="h-64" /> : detail ? (
          <div className="space-y-4">
            {/* Profile */}
            <Card className="bg-card/50">
              <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div><span className="text-muted-foreground">Username</span><p className="font-medium">{detail.profile?.username || 'N/A'}</p></div>
                <div><span className="text-muted-foreground">Full Name</span><p className="font-medium">{detail.profile?.full_name || 'N/A'}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium truncate">{detail.profile?.email || 'N/A'}</p></div>
                <div><span className="text-muted-foreground">Referrer</span><p className="font-mono text-[10px] truncate">{detail.profile?.referrer_id || 'None'}</p></div>
              </CardContent>
            </Card>

            {/* Balance summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'Current Balance', value: detail.balance?.current, color: 'text-amber-400' },
                { label: 'Total Credited', value: detail.balance?.total_credited, color: 'text-green-400' },
                { label: 'Total Debited', value: detail.balance?.total_debited, color: 'text-red-400' },
                { label: 'Ledger Net', value: detail.balance?.ledger_net, color: 'text-purple-400' },
              ].map((c, i) => (
                <Card key={i} className="bg-card/50">
                  <CardContent className="p-3">
                    <p className="text-[10px] text-muted-foreground">{c.label}</p>
                    <p className={`font-mono font-bold text-sm ${c.color}`}>{fmtBSK(c.value)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {detail.balance?.mismatch !== 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs text-red-400 font-semibold">
                  Mismatch detected: {fmtBSK(detail.balance?.mismatch)} BSK
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div><span className="text-muted-foreground">Credit Txns</span><p className="font-bold">{detail.balance?.credit_count}</p></div>
              <div><span className="text-muted-foreground">Debit Txns</span><p className="font-bold">{detail.balance?.debit_count}</p></div>
              <div><span className="text-muted-foreground">First Activity</span><p>{detail.balance?.first_activity ? format(new Date(detail.balance.first_activity), 'PP') : 'N/A'}</p></div>
              <div><span className="text-muted-foreground">Last Activity</span><p>{detail.balance?.last_activity ? format(new Date(detail.balance.last_activity), 'PP') : 'N/A'}</p></div>
            </div>

            {/* Source breakdown */}
            <Card className="bg-card/50">
              <CardHeader className="pb-1"><CardTitle className="text-xs">Source Breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Source</TableHead>
                      <TableHead className="text-[10px] text-right">Credit</TableHead>
                      <TableHead className="text-[10px] text-right">Debit</TableHead>
                      <TableHead className="text-[10px] text-right">Net</TableHead>
                      <TableHead className="text-[10px] text-right">Txns</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail.source_breakdown || []).map((s: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-[10px] font-mono">{s.source}</TableCell>
                        <TableCell className="text-[10px] text-right font-mono text-green-400">{fmtBSK(s.credited)}</TableCell>
                        <TableCell className="text-[10px] text-right font-mono text-red-400">{fmtBSK(s.debited)}</TableCell>
                        <TableCell className={`text-[10px] text-right font-mono font-bold ${s.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtBSK(s.net)}</TableCell>
                        <TableCell className="text-[10px] text-right">{s.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Admin adjustments */}
            {detail.admin_adjustments?.length > 0 && (
              <Card className="bg-red-500/5 border-red-500/20">
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs text-red-400 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" /> Admin Adjustments ({detail.admin_adjustments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Date</TableHead>
                        <TableHead className="text-[10px]">Operation</TableHead>
                        <TableHead className="text-[10px] text-right">Amount</TableHead>
                        <TableHead className="text-[10px]">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.admin_adjustments.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-[10px]">{format(new Date(a.created_at), 'PP p')}</TableCell>
                          <TableCell className="text-[10px]">{a.operation}</TableCell>
                          <TableCell className="text-[10px] text-right font-mono">{fmtBSK(a.amount)}</TableCell>
                          <TableCell className="text-[10px] max-w-[200px] truncate">{a.reason}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Transaction history */}
            <Card className="bg-card/50">
              <CardHeader className="pb-1 flex flex-row items-center justify-between">
                <CardTitle className="text-xs">Transaction History</CardTitle>
                <Select value={sourceFilter} onValueChange={v => { setSourceFilter(v === 'all' ? '' : v); setHistPage(1); }}>
                  <SelectTrigger className="w-36 h-7 text-[10px]"><SelectValue placeholder="All sources" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {(detail.source_breakdown || []).map((s: any) => (
                      <SelectItem key={s.source} value={s.source}>{s.source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {histLoading ? <Skeleton className="h-32" /> : (
                  <>
                    <ScrollArea className="max-h-[300px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[10px]">Date</TableHead>
                            <TableHead className="text-[10px]">Type</TableHead>
                            <TableHead className="text-[10px] text-right">Amount</TableHead>
                            <TableHead className="text-[10px]">Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(history?.transactions || []).map((tx: any) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-[10px]">{format(new Date(tx.created_at), 'PP p')}</TableCell>
                              <TableCell className="text-[10px]">
                                <Badge variant={tx.tx_type === 'credit' ? 'default' : 'destructive'} className="text-[9px]">
                                  {tx.tx_subtype || tx.tx_type}
                                </Badge>
                              </TableCell>
                              <TableCell className={`text-[10px] text-right font-mono font-bold ${tx.tx_type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                                {tx.tx_type === 'credit' ? '+' : '-'}{fmtBSK(tx.amount_bsk)}
                              </TableCell>
                              <TableCell className="text-[10px] max-w-[150px] truncate text-muted-foreground">{tx.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-muted-foreground">{history?.total || 0} transactions</p>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" disabled={histPage <= 1} onClick={() => setHistPage(p => p - 1)}>
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[10px]" disabled={(history?.transactions?.length || 0) < 20} onClick={() => setHistPage(p => p + 1)}>
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default function AdminBSKForensicAudit() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('summary');

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Tradable BSK Forensic Audit</h1>
          <p className="text-xs text-muted-foreground">Internal ledger balance — complete platform-wide audit & reconciliation</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </Badge>
      </div>

      <SummaryCards />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full md:w-auto md:inline-grid gap-1">
          <TabsTrigger value="summary" className="text-xs">Sources</TabsTrigger>
          <TabsTrigger value="holders" className="text-xs">Top Holders</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">All Users</TabsTrigger>
          <TabsTrigger value="reconciliation" className="text-xs">Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="summary"><SourceBreakdownTab /></TabsContent>
        <TabsContent value="holders"><TopHoldersTab /></TabsContent>
        <TabsContent value="users"><AllUsersTab onSelectUser={setSelectedUserId} /></TabsContent>
        <TabsContent value="reconciliation"><MismatchesTab onSelectUser={setSelectedUserId} /></TabsContent>
      </Tabs>

      {selectedUserId && (
        <UserDetailDialog userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}
    </div>
  );
}
