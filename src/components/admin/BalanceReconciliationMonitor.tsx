/**
 * Balance Reconciliation Monitor
 * Admin UI for viewing and resolving balance discrepancies
 * Part of Phase 2.5: Balance Reconciliation System
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface ReconciliationReport {
  id: string;
  user_id: string;
  asset_id: string;
  wallet_balance: number;
  ledger_sum: number;
  discrepancy: number;
  report_date: string;
  resolved: boolean;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

interface DiscrepancySummary {
  user_id: string;
  asset_symbol: string;
  wallet_total: number;
  ledger_total: number;
  discrepancy: number;
}

export function BalanceReconciliationMonitor() {
  const [reports, setReports] = useState<ReconciliationReport[]>([]);
  const [liveDiscrepancies, setLiveDiscrepancies] = useState<DiscrepancySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningRecon, setRunningRecon] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('balance_reconciliation_reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      toast.error('Failed to load reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const runReconciliation = async () => {
    setRunningRecon(true);
    try {
      const { data, error } = await supabase.rpc('run_balance_reconciliation');

      if (error) throw error;
      
      setLiveDiscrepancies(data || []);
      toast.success(`Reconciliation complete! Found ${data?.length || 0} discrepancies`);
      
      // Reload reports to show any new entries
      await loadReports();
    } catch (error: any) {
      toast.error('Failed to run reconciliation: ' + error.message);
    } finally {
      setRunningRecon(false);
    }
  };

  const resolveDiscrepancy = async (reportId: string) => {
    const notes = resolutionNotes[reportId];
    if (!notes || notes.trim() === '') {
      toast.error('Please enter resolution notes');
      return;
    }

    setResolvingId(reportId);
    try {
      const { error } = await supabase
        .from('balance_reconciliation_reports')
        .update({
          resolved: true,
          resolution_notes: notes,
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Discrepancy marked as resolved');
      await loadReports();
      setResolutionNotes(prev => {
        const updated = { ...prev };
        delete updated[reportId];
        return updated;
      });
    } catch (error: any) {
      toast.error('Failed to resolve: ' + error.message);
    } finally {
      setResolvingId(null);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const unresolvedCount = reports.filter(r => !r.resolved).length;
  const totalDiscrepancy = reports
    .filter(r => !r.resolved)
    .reduce((sum, r) => sum + Math.abs(r.discrepancy), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-heading font-semibold">Balance Reconciliation Monitor</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Detect and resolve balance discrepancies between wallet and ledger
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadReports}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={runReconciliation}
                variant="default"
                size="sm"
                disabled={runningRecon}
              >
                <AlertTriangle className={`w-4 h-4 mr-2 ${runningRecon ? 'animate-pulse' : ''}`} />
                {runningRecon ? 'Running...' : 'Run Reconciliation'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Unresolved Issues</div>
              <div className="text-2xl font-bold mt-1">{unresolvedCount}</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Discrepancy</div>
              <div className="text-2xl font-bold mt-1">{totalDiscrepancy.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Reports</div>
              <div className="text-2xl font-bold mt-1">{reports.length}</div>
            </div>
          </div>

          {/* Live Discrepancies (if just ran) */}
          {liveDiscrepancies.length > 0 && (
            <div className="mb-6 p-4 border border-warning rounded-lg bg-warning/5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                Live Discrepancies Found
              </h3>
              <div className="space-y-2">
                {liveDiscrepancies.map((disc, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm p-2 bg-background rounded">
                    <div>
                      <span className="font-mono text-xs">{disc.user_id.slice(0, 8)}</span>
                      <span className="mx-2">•</span>
                      <span className="font-semibold">{disc.asset_symbol}</span>
                    </div>
                    <div className="flex gap-4">
                      <span>Wallet: {disc.wallet_total.toFixed(4)}</span>
                      <span>Ledger: {disc.ledger_total.toFixed(4)}</span>
                      <span className="text-destructive font-semibold">
                        Diff: {disc.discrepancy.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports Table */}
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-success" />
                <p>No balance discrepancies found!</p>
                <p className="text-sm mt-1">All balances are reconciled.</p>
              </div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  className={`p-4 border rounded-lg ${
                    report.resolved
                      ? 'bg-success/5 border-success/20'
                      : 'bg-destructive/5 border-destructive/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={report.resolved ? 'default' : 'destructive'}>
                          {report.resolved ? 'Resolved' : 'Unresolved'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.report_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        User: {report.user_id.slice(0, 8)}... | Asset ID: {report.asset_id.slice(0, 8)}...
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Wallet:</span> {report.wallet_balance.toFixed(4)}
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Ledger:</span> {report.ledger_sum.toFixed(4)}
                      </div>
                      <div className="text-lg font-bold text-destructive">
                        {report.discrepancy > 0 ? '+' : ''}{report.discrepancy.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {report.resolved ? (
                    <div className="text-sm bg-background p-3 rounded">
                      <div className="font-semibold mb-1">Resolution Notes:</div>
                      <div className="text-muted-foreground">{report.resolution_notes}</div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Resolved: {new Date(report.resolved_at!).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Enter resolution notes (e.g., 'Manual adjustment made to correct deposit error')"
                        value={resolutionNotes[report.id] || ''}
                        onChange={(e) =>
                          setResolutionNotes(prev => ({ ...prev, [report.id]: e.target.value }))
                        }
                        className="text-sm"
                        rows={2}
                      />
                      <Button
                        onClick={() => resolveDiscrepancy(report.id)}
                        size="sm"
                        disabled={resolvingId === report.id}
                      >
                        {resolvingId === report.id ? 'Resolving...' : 'Mark as Resolved'}
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
