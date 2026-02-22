import React, { useState } from 'react';
import { useGlobalReconciliation, useUserReconciliation, useLedgerStats } from '@/hooks/useAdminTradingReconciliation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertTriangle, CheckCircle2, Search, Shield, Database, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function AdminTradingReconciliation() {
  const { data: globalData, isLoading: globalLoading, refetch: refetchGlobal } = useGlobalReconciliation();
  const { data: ledgerStats, isLoading: statsLoading } = useLedgerStats();
  const [selectedAsset, setSelectedAsset] = useState<string | undefined>();
  const { data: userData, isLoading: usersLoading, refetch: refetchUsers } = useUserReconciliation(selectedAsset);
  const [searchUser, setSearchUser] = useState('');
  const [isRunningRecon, setIsRunningRecon] = useState(false);

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
    u.user_id.toLowerCase().includes(searchUser.toLowerCase())
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)]">Trading Reconciliation</h1>
          <p className="text-sm text-[hsl(240_10%_70%)]">Real-time balance audit & mismatch detection</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchGlobal(); refetchUsers(); }}
            className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleRunReconciliation}
            disabled={isRunningRecon}
            className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_55%)] text-white"
          >
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
            <p className="text-sm text-[hsl(0_70%_80%)]">
              Discrepancies found between expected and actual balances. This may be due to inter-user trades (normal) or data gaps.
            </p>
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

      {/* Ledger Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-[hsl(262_100%_65%)]" />
              <span className="text-xs text-[hsl(240_10%_70%)]">Ledger Entries</span>
            </div>
            <p className="text-xl font-bold text-[hsl(0_0%_98%)]">
              {statsLoading ? '...' : ledgerStats?.total_entries?.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-[hsl(145_70%_60%)]" />
              <span className="text-xs text-[hsl(240_10%_70%)]">Entry Types</span>
            </div>
            <p className="text-xl font-bold text-[hsl(0_0%_98%)]">
              {statsLoading ? '...' : ledgerStats?.entry_types?.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-[hsl(45_100%_60%)]" />
              <span className="text-xs text-[hsl(240_10%_70%)]">Assets Tracked</span>
            </div>
            <p className="text-xl font-bold text-[hsl(0_0%_98%)]">
              {globalLoading ? '...' : globalData?.length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-[hsl(262_100%_65%)]" />
              <span className="text-xs text-[hsl(240_10%_70%)]">Last Entry</span>
            </div>
            <p className="text-sm font-bold text-[hsl(0_0%_98%)]">
              {statsLoading ? '...' : ledgerStats?.last_entry_at ? format(new Date(ledgerStats.last_entry_at), 'MMM d, HH:mm') : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Entry Type Breakdown */}
      {ledgerStats?.entry_types && (
        <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-[hsl(0_0%_98%)]">Ledger Entry Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ledgerStats.entry_types.map(et => (
                <Badge key={et.entry_type} variant="outline" className="border-[hsl(235_20%_22%)] text-[hsl(240_10%_70%)]">
                  {et.entry_type}: <span className="ml-1 text-[hsl(0_0%_98%)] font-bold">{et.count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Asset Reconciliation */}
      <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-[hsl(0_0%_98%)] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[hsl(262_100%_65%)]" />
            Global Asset Balances
          </CardTitle>
        </CardHeader>
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
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">User Available</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">User Locked</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Platform Fees</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Users</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(globalData || []).map(a => (
                    <tr key={a.asset_symbol} className="border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)]">
                      <td className="py-2 font-semibold text-[hsl(0_0%_98%)]">{a.asset_symbol}</td>
                      <td className="text-right py-2 text-[hsl(145_70%_60%)]">{a.total_deposits.toFixed(4)}</td>
                      <td className="text-right py-2 text-[hsl(0_70%_68%)]">{a.total_withdrawals.toFixed(4)}</td>
                      <td className="text-right py-2 text-[hsl(0_0%_98%)]">{a.total_user_available.toFixed(4)}</td>
                      <td className="text-right py-2 text-[hsl(45_100%_60%)]">{a.total_user_locked.toFixed(4)}</td>
                      <td className="text-right py-2 text-[hsl(262_100%_65%)]">{a.total_platform_fees.toFixed(4)}</td>
                      <td className="text-right py-2 text-[hsl(240_10%_70%)]">{a.user_count}</td>
                      <td className="text-right py-2">
                        {Math.abs(a.discrepancy) > 0.01 ? (
                          <Badge className="bg-[hsl(0_70%_20%)] text-[hsl(0_70%_68%)] text-xs">
                            Δ {a.discrepancy.toFixed(4)}
                          </Badge>
                        ) : (
                          <Badge className="bg-[hsl(145_70%_20%)] text-[hsl(145_70%_60%)] text-xs">
                            ✓ OK
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User-Level Reconciliation */}
      <Card className="bg-[hsl(235_28%_15%)] border-[hsl(235_20%_22%)]">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-[hsl(0_0%_98%)] flex items-center gap-2">
              <Shield className="h-5 w-5 text-[hsl(262_100%_65%)]" />
              User-Level Audit
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-[hsl(240_10%_50%)]" />
                <Input
                  placeholder="Search user..."
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
          </div>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <p className="text-[hsl(240_10%_70%)]">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(235_20%_22%)]">
                    <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">User</th>
                    <th className="text-left py-2 text-[hsl(240_10%_70%)] font-medium">Asset</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Available</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Locked</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Total</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Ledger Net</th>
                    <th className="text-right py-2 text-[hsl(240_10%_70%)] font-medium">Drift</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.slice(0, 100).map((u, i) => (
                    <tr key={`${u.user_id}-${u.asset_symbol}-${i}`} className="border-b border-[hsl(235_20%_22%/0.5)] hover:bg-[hsl(235_28%_18%)]">
                      <td className="py-2 text-[hsl(0_0%_98%)] font-mono text-xs">{u.username}</td>
                      <td className="py-2 text-[hsl(262_100%_65%)]">{u.asset_symbol}</td>
                      <td className="text-right py-2 text-[hsl(0_0%_98%)]">{u.available.toFixed(4)}</td>
                      <td className="text-right py-2 text-[hsl(45_100%_60%)]">{u.locked.toFixed(4)}</td>
                      <td className="text-right py-2 text-[hsl(0_0%_98%)] font-semibold">{u.total.toFixed(4)}</td>
                      <td className="text-right py-2 text-[hsl(240_10%_70%)]">{u.ledger_net.toFixed(4)}</td>
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
              {filteredUsers.length > 100 && (
                <p className="text-center text-xs text-[hsl(240_10%_50%)] py-2">
                  Showing 100 of {filteredUsers.length} users
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
