import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, Download, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

interface DiscrepancyEntry {
  user_id: string;
  user_email: string;
  user_name: string;
  holding_balance: number;
  holding_ledger_total: number;
  holding_discrepancy: number;
  withdrawable_balance: number;
  withdrawable_ledger_total: number;
  withdrawable_discrepancy: number;
  total_discrepancy: number;
}

interface ReconciliationStats {
  total_users: number;
  users_with_discrepancies: number;
  total_holding_discrepancy: number;
  total_withdrawable_discrepancy: number;
  reconciliation_percentage: number;
}

export default function BSKReconciliation() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const { toast } = useToast();

  // Run reconciliation
  const { data: reconciliationData, isLoading, refetch } = useQuery({
    queryKey: ['bsk-reconciliation', searchTerm],
    queryFn: async () => {
      // Step 1: Get all user balances
      let balanceQuery = supabase
        .from('user_bsk_balances')
        .select(`
          user_id,
          holding_balance,
          withdrawable_balance,
          profiles:user_id (
            email,
            full_name
          )
        `);

      if (searchTerm) {
        if (searchTerm.includes('@')) {
          balanceQuery = balanceQuery.ilike('profiles.email', `%${searchTerm}%`);
        } else {
          balanceQuery = balanceQuery.eq('user_id', searchTerm);
        }
      }

      const { data: balances, error: balanceError } = await balanceQuery;

      if (balanceError) throw balanceError;

      const discrepancies: DiscrepancyEntry[] = [];

      // Step 2: For each user, calculate ledger totals
      for (const balance of balances || []) {
        // Calculate holding ledger total
        const { data: holdingLedger, error: holdingError } = await supabase
          .from('bsk_holding_ledger')
          .select('amount_bsk')
          .eq('user_id', balance.user_id);

        if (holdingError) {
          console.error('Error fetching holding ledger:', holdingError);
          continue;
        }

        // Calculate withdrawable ledger total
        const { data: withdrawableLedger, error: withdrawableError } = await supabase
          .from('bsk_withdrawable_ledger')
          .select('amount_bsk')
          .eq('user_id', balance.user_id);

        if (withdrawableError) {
          console.error('Error fetching withdrawable ledger:', withdrawableError);
          continue;
        }

        const holdingLedgerTotal = holdingLedger?.reduce((sum, entry) => sum + Number(entry.amount_bsk), 0) || 0;
        const withdrawableLedgerTotal = withdrawableLedger?.reduce((sum, entry) => sum + Number(entry.amount_bsk), 0) || 0;

        const holdingDiscrepancy = Number(balance.holding_balance) - holdingLedgerTotal;
        const withdrawableDiscrepancy = Number(balance.withdrawable_balance) - withdrawableLedgerTotal;

        // Only include users with discrepancies > 0.01 BSK (to account for floating point errors)
        if (Math.abs(holdingDiscrepancy) > 0.01 || Math.abs(withdrawableDiscrepancy) > 0.01) {
          discrepancies.push({
            user_id: balance.user_id,
            user_email: (balance.profiles as any)?.email || 'N/A',
            user_name: (balance.profiles as any)?.full_name || 'N/A',
            holding_balance: Number(balance.holding_balance),
            holding_ledger_total: holdingLedgerTotal,
            holding_discrepancy: holdingDiscrepancy,
            withdrawable_balance: Number(balance.withdrawable_balance),
            withdrawable_ledger_total: withdrawableLedgerTotal,
            withdrawable_discrepancy: withdrawableDiscrepancy,
            total_discrepancy: Math.abs(holdingDiscrepancy) + Math.abs(withdrawableDiscrepancy)
          });
        }
      }

      // Calculate stats
      const stats: ReconciliationStats = {
        total_users: balances?.length || 0,
        users_with_discrepancies: discrepancies.length,
        total_holding_discrepancy: discrepancies.reduce((sum, d) => sum + Math.abs(d.holding_discrepancy), 0),
        total_withdrawable_discrepancy: discrepancies.reduce((sum, d) => sum + Math.abs(d.withdrawable_discrepancy), 0),
        reconciliation_percentage: balances?.length ? 
          ((balances.length - discrepancies.length) / balances.length) * 100 : 100
      };

      return {
        discrepancies: discrepancies.sort((a, b) => b.total_discrepancy - a.total_discrepancy),
        stats
      };
    },
    enabled: true,
    staleTime: 0 // Always fetch fresh data
  });

  const exportToCSV = () => {
    if (!reconciliationData?.discrepancies.length) {
      toast({
        title: "No Discrepancies",
        description: "No discrepancies to export",
        variant: "destructive"
      });
      return;
    }

    const headers = [
      'User ID',
      'Email',
      'Name',
      'Holding Balance',
      'Holding Ledger',
      'Holding Discrepancy',
      'Withdrawable Balance',
      'Withdrawable Ledger',
      'Withdrawable Discrepancy',
      'Total Discrepancy'
    ];

    const rows = reconciliationData.discrepancies.map(d => [
      d.user_id,
      d.user_email,
      d.user_name,
      d.holding_balance.toFixed(2),
      d.holding_ledger_total.toFixed(2),
      d.holding_discrepancy.toFixed(2),
      d.withdrawable_balance.toFixed(2),
      d.withdrawable_ledger_total.toFixed(2),
      d.withdrawable_discrepancy.toFixed(2),
      d.total_discrepancy.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsk_reconciliation_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Exported Successfully",
      description: `${reconciliationData.discrepancies.length} discrepancies exported`
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">BSK Reconciliation Tool</h1>
          <p className="text-muted-foreground mt-2">
            Compare ledger totals vs user balances to identify and fix discrepancies
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Reconciling...' : 'Run Reconciliation'}
          </Button>
          <Button 
            onClick={exportToCSV} 
            variant="outline"
            disabled={!reconciliationData?.discrepancies.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {reconciliationData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reconciliationData.stats.total_users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Discrepancies Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {reconciliationData.stats.users_with_discrepancies}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Holding Discrepancy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {reconciliationData.stats.total_holding_discrepancy.toFixed(2)} BSK
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Withdrawable Discrepancy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {reconciliationData.stats.total_withdrawable_discrepancy.toFixed(2)} BSK
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Reconciliation Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  {reconciliationData.stats.reconciliation_percentage.toFixed(1)}%
                </div>
                <Progress value={reconciliationData.stats.reconciliation_percentage} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Alert */}
      {reconciliationData && (
        <Alert variant={reconciliationData.discrepancies.length > 0 ? "destructive" : "default"}>
          {reconciliationData.discrepancies.length > 0 ? (
            <>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Found {reconciliationData.discrepancies.length} user(s) with balance discrepancies. 
                Review the list below and investigate each case.
              </AlertDescription>
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                ✅ All user balances are reconciled with ledger totals. No discrepancies found!
              </AlertDescription>
            </>
          )}
        </Alert>
      )}

      {/* Search Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user ID or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button onClick={() => refetch()} variant="outline">
              Apply Filter
            </Button>
            {searchTerm && (
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setTimeout(() => refetch(), 100);
                }} 
                variant="ghost"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Discrepancies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Discrepancies</CardTitle>
          <CardDescription>
            Users with balance mismatches between balances and ledger totals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reconciliationData?.discrepancies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <p className="text-lg font-medium">No Discrepancies Found</p>
              <p className="text-sm">All user balances match their ledger totals</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Holding Balance</TableHead>
                    <TableHead>Holding Ledger</TableHead>
                    <TableHead>Holding Diff</TableHead>
                    <TableHead>Withdrawable Balance</TableHead>
                    <TableHead>Withdrawable Ledger</TableHead>
                    <TableHead>Withdrawable Diff</TableHead>
                    <TableHead>Total Discrepancy</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliationData?.discrepancies.map((discrepancy) => (
                    <TableRow key={discrepancy.user_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-mono text-xs">{discrepancy.user_id.substring(0, 8)}...</span>
                          <span className="text-xs text-muted-foreground">{discrepancy.user_email}</span>
                          <span className="text-xs text-muted-foreground">{discrepancy.user_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {discrepancy.holding_balance.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {discrepancy.holding_ledger_total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={Math.abs(discrepancy.holding_discrepancy) > 0.01 ? "destructive" : "secondary"}>
                          {discrepancy.holding_discrepancy >= 0 ? '+' : ''}
                          {discrepancy.holding_discrepancy.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {discrepancy.withdrawable_balance.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {discrepancy.withdrawable_ledger_total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={Math.abs(discrepancy.withdrawable_discrepancy) > 0.01 ? "destructive" : "secondary"}>
                          {discrepancy.withdrawable_discrepancy >= 0 ? '+' : ''}
                          {discrepancy.withdrawable_discrepancy.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="font-mono">
                          {discrepancy.total_discrepancy.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(discrepancy.user_id);
                              toast({ title: "Copied", description: "User ID copied to clipboard" });
                            }}
                          >
                            Copy ID
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card>
        <CardHeader>
          <CardTitle>How to Fix Discrepancies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium mb-1">1. Investigate the Cause</h4>
            <p className="text-sm text-muted-foreground">
              Check the BSK Ledger Viewer to see the transaction history for the affected user. 
              Look for missing entries, duplicate entries, or incorrect amounts.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">2. Review Edge Function Logs</h4>
            <p className="text-sm text-muted-foreground">
              Check edge function logs for any errors during BSK transactions (team income, badge purchases, etc.)
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-1">3. Manual Correction (Last Resort)</h4>
            <p className="text-sm text-muted-foreground">
              If necessary, use the BSK Management panel to manually adjust balances. 
              Always document the reason in the notes field.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
