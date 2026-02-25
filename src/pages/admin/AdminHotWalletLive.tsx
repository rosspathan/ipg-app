import { useState } from 'react';
import { useHotWalletLive, TokenFlow, RecentTx } from '@/hooks/useHotWalletLive';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RefreshCw, ExternalLink, Download, Clock, AlertTriangle,
  CheckCircle, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronDown, ChevronUp,
  Wallet, Activity
} from 'lucide-react';
import { format } from 'date-fns';

function formatNum(n: number, decimals = 4): string {
  if (Math.abs(n) < 0.000001) return '0';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: decimals });
}

function shortenHash(hash: string | null): string {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function exportCSV(tokenFlows: TokenFlow[], recentTxs: RecentTx[], walletAddress: string) {
  // Token summary
  let csv = 'HOT WALLET LIVE REPORT\n';
  csv += `Wallet Address,${walletAddress}\n`;
  csv += `Generated,${new Date().toISOString()}\n\n`;
  csv += 'TOKEN SUMMARY\n';
  csv += 'Token,On-Chain Balance,Deposits In,Withdrawals Out,Internal In,Internal Out,Fees,Net Flow,Expected,Delta\n';
  tokenFlows.forEach(t => {
    csv += `${t.symbol},${t.onchainBalance},${t.totalDeposits},${t.totalWithdrawals},${t.totalInternalIn},${t.totalInternalOut},${t.totalFees},${t.netFlow},${t.expectedBalance},${t.delta}\n`;
  });
  csv += '\nRECENT TRANSACTIONS\n';
  csv += 'Date,Type,Token,Amount,Status,Tx Hash\n';
  recentTxs.forEach(tx => {
    csv += `${tx.createdAt},${tx.type},${tx.symbol},${tx.amount},${tx.status},${tx.txHash || ''}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hot-wallet-live-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: typeof ArrowDownLeft }> = {
  deposit:      { label: 'Deposit',      color: 'text-green-400',  icon: ArrowDownLeft },
  withdrawal:   { label: 'Withdrawal',   color: 'text-red-400',    icon: ArrowUpRight },
  internal_in:  { label: 'Internal In',  color: 'text-blue-400',   icon: ArrowLeftRight },
  internal_out: { label: 'Internal Out',  color: 'text-orange-400', icon: ArrowLeftRight },
};

export default function AdminHotWalletLive() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useHotWalletLive(20000);
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());
  const [expandedTxs, setExpandedTxs] = useState<Set<string>>(new Set());
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  const toggleToken = (s: string) => {
    setExpandedTokens(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const toggleTx = (id: string) => {
    setExpandedTxs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" label="Loading live data..." /></div>;
  if (error) return <div className="p-6 text-destructive">Error: {(error as Error).message}</div>;
  if (!data) return <div className="p-6 text-muted-foreground">No hot wallet configured.</div>;

  const { walletAddress, tokenFlows, recentTransactions, lastSyncAt } = data;

  const filteredTxs = recentTransactions.filter(tx => {
    if (filterSymbol !== 'ALL' && tx.symbol !== filterSymbol) return false;
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    return true;
  });

  const hasMismatch = tokenFlows.some(t => Math.abs(t.delta) > 0.01);

  return (
    <div className="space-y-6 p-2 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Live Hot Wallet Monitor
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="font-mono">{walletAddress ? shortenHash(walletAddress) : 'N/A'}</span>
            {walletAddress && (
              <a href={`https://bscscan.com/address/${walletAddress}`} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1">
                BscScan <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Last sync: {format(lastSyncAt, 'HH:mm:ss')}
          </div>
          <div className={`h-2 w-2 rounded-full ${hasMismatch ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCSV(tokenFlows, recentTransactions, walletAddress)} className="gap-1">
            <Download className="h-3 w-3" /> CSV
          </Button>
        </div>
      </div>

      {/* Mismatch banner */}
      {hasMismatch && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Balance mismatch detected — on-chain balance differs from expected. Review delta values below.
        </div>
      )}

      {/* Token Flow Cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {tokenFlows.map(token => {
          const expanded = expandedTokens.has(token.symbol);
          const deltaOk = Math.abs(token.delta) < 0.01;
          return (
            <Card key={token.symbol} className={`border ${deltaOk ? 'border-border' : 'border-destructive/50'} bg-card`}>
              <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleToken(token.symbol)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    {token.symbol}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {deltaOk ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> OK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Δ {formatNum(token.delta)}
                      </Badge>
                    )}
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Always visible: on-chain balance */}
                <div className="text-2xl font-bold font-mono tabular-nums">
                  {formatNum(token.onchainBalance)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">{token.symbol}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Live on-chain balance</p>

                {expanded && (
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deposits In</span>
                        <span className="text-green-400 font-mono">+{formatNum(token.totalDeposits)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Withdrawals Out</span>
                        <span className="text-red-400 font-mono">−{formatNum(token.totalWithdrawals)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Internal In</span>
                        <span className="text-blue-400 font-mono">+{formatNum(token.totalInternalIn)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Internal Out</span>
                        <span className="text-orange-400 font-mono">−{formatNum(token.totalInternalOut)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fees Collected</span>
                        <span className="font-mono">{formatNum(token.totalFees)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Net Flow</span>
                        <span className="font-mono font-semibold">{formatNum(token.netFlow)}</span>
                      </div>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Balance</span>
                        <span className="font-mono">{formatNum(token.expectedBalance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">On-Chain Actual</span>
                        <span className="font-mono">{formatNum(token.onchainBalance)}</span>
                      </div>
                      <div className={`flex justify-between font-semibold ${deltaOk ? 'text-green-400' : 'text-destructive'}`}>
                        <span>Delta (Δ)</span>
                        <span className="font-mono">{formatNum(token.delta)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <Card className="bg-card">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-base">Recent Movements (Audit Trail)</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <select value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)}
                className="text-xs bg-background border border-border rounded px-2 py-1">
                <option value="ALL">All Tokens</option>
                {['BNB', 'USDT', 'BSK', 'IPG', 'USDI'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="text-xs bg-background border border-border rounded px-2 py-1">
                <option value="ALL">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdrawal">Withdrawals</option>
                <option value="internal_in">Internal In</option>
                <option value="internal_out">Internal Out</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left py-2 px-2">Date (UTC)</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Token</th>
                  <th className="text-right py-2 px-2">Amount</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.slice(0, 100).map(tx => {
                  const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.deposit;
                  const Icon = cfg.icon;
                  return (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-mono text-muted-foreground">
                        {tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM yy HH:mm') : '—'}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`flex items-center gap-1 ${cfg.color}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-semibold">{tx.symbol}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatNum(tx.amount)}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className={`text-[10px] ${
                          tx.status === 'credited' || tx.status === 'completed' || tx.status === 'success'
                            ? 'text-green-400 border-green-500/30'
                            : tx.status === 'pending'
                            ? 'text-yellow-400 border-yellow-500/30'
                            : 'text-red-400 border-red-500/30'
                        }`}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 font-mono">
                        {tx.txHash ? (
                          <a href={`https://bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1">
                            {shortenHash(tx.txHash)} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTxs.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No transactions found.</p>
            )}
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filteredTxs.slice(0, 100).map(tx => {
              const cfg = TYPE_CONFIG[tx.type] || TYPE_CONFIG.deposit;
              const Icon = cfg.icon;
              const isExpanded = expandedTxs.has(tx.id);
              return (
                <div key={tx.id} className="bg-muted/30 border border-border rounded-lg p-3 cursor-pointer"
                  onClick={() => toggleTx(tx.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                      <span className="font-semibold text-sm">{tx.symbol}</span>
                      <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <span className="font-mono text-sm font-bold">{formatNum(tx.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                    <span>{tx.createdAt ? format(new Date(tx.createdAt), 'dd MMM yy HH:mm') : '—'}</span>
                    <Badge variant="outline" className={`text-[10px] ${
                      tx.status === 'credited' || tx.status === 'completed' || tx.status === 'success'
                        ? 'text-green-400 border-green-500/30'
                        : tx.status === 'pending'
                        ? 'text-yellow-400 border-yellow-500/30'
                        : 'text-red-400 border-red-500/30'
                    }`}>
                      {tx.status}
                    </Badge>
                  </div>
                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-border text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID</span>
                        <span className="font-mono">{tx.id.slice(0, 12)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tx Hash</span>
                        {tx.txHash ? (
                          <a href={`https://bscscan.com/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-primary hover:underline font-mono" onClick={e => e.stopPropagation()}>
                            {shortenHash(tx.txHash)}
                          </a>
                        ) : <span>—</span>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredTxs.length === 0 && (
              <p className="text-center text-muted-foreground py-8 text-sm">No transactions found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
