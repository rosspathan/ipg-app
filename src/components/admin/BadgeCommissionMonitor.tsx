import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, RefreshCw, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CommissionHealth {
  user_id: string;
  current_badge: string;
  price_bsk: number;
  purchased_at: string;
  sponsor_id: string | null;
  status: 'NO_SPONSOR' | 'MISSING_COMMISSION' | 'OK';
  commission_paid: number | null;
  expected_commission: number;
}

export function BadgeCommissionMonitor() {
  const [backfillRunning, setBackfillRunning] = useState(false);
  const queryClient = useQueryClient();

  // Fetch commission health data
  const { data: healthData, isLoading, refetch } = useQuery({
    queryKey: ['badge-commission-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_commission_health')
        .select('*')
        .limit(100);

      if (error) throw error;
      return data as CommissionHealth[];
    }
  });

  // Run backfill mutation
  const backfillMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const { data, error } = await supabase.functions.invoke('backfill-badge-commissions', {
        body: {
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date().toISOString(),
          dry_run: dryRun
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.dry_run) {
        toast.success(`Dry run complete: ${data.summary.processed} would be processed`);
      } else {
        toast.success(`Backfill complete: ${data.summary.processed} commissions processed`);
      }
      queryClient.invalidateQueries({ queryKey: ['badge-commission-health'] });
    },
    onError: (error: any) => {
      toast.error(`Backfill failed: ${error.message}`);
    }
  });

  const stats = healthData ? {
    total: healthData.length,
    ok: healthData.filter(h => h.status === 'OK').length,
    missingCommission: healthData.filter(h => h.status === 'MISSING_COMMISSION').length,
    noSponsor: healthData.filter(h => h.status === 'NO_SPONSOR').length,
    totalMissed: healthData
      .filter(h => h.status === 'MISSING_COMMISSION')
      .reduce((sum, h) => sum + h.expected_commission, 0)
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Badge Commission Monitor</h2>
          <p className="text-muted-foreground text-sm">Track and fix missing commission payments</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Purchases</div>
            <div className="text-2xl font-bold mt-1">{stats.total}</div>
          </Card>
          <Card className="p-4 border-success">
            <div className="text-sm text-muted-foreground">Commissions OK</div>
            <div className="text-2xl font-bold mt-1 text-success">{stats.ok}</div>
          </Card>
          <Card className="p-4 border-warning">
            <div className="text-sm text-muted-foreground">Missing Commission</div>
            <div className="text-2xl font-bold mt-1 text-warning">{stats.missingCommission}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.totalMissed.toFixed(2)} BSK unpaid
            </div>
          </Card>
          <Card className="p-4 border-muted">
            <div className="text-sm text-muted-foreground">No Sponsor</div>
            <div className="text-2xl font-bold mt-1">{stats.noSponsor}</div>
          </Card>
        </div>
      ) : null}

      {/* Backfill Actions */}
      {stats && stats.missingCommission > 0 && (
        <Card className="p-6 border-warning">
          <div className="flex items-start gap-4">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold">Missing Commissions Detected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.missingCommission} badge purchases have sponsors but no commission records. 
                Total unpaid: {stats.totalMissed.toFixed(2)} BSK
              </p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => backfillMutation.mutate(true)}
                  disabled={backfillMutation.isPending}
                >
                  Preview Backfill (Dry Run)
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    if (confirm('Process missing commissions? This will credit sponsors\' balances.')) {
                      backfillMutation.mutate(false);
                    }
                  }}
                  disabled={backfillMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Process Missing Commissions
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Commission Status Table */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Recent Badge Purchases</h3>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : healthData && healthData.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">User ID</th>
                  <th className="text-left py-2">Badge</th>
                  <th className="text-right py-2">Price (BSK)</th>
                  <th className="text-left py-2">Purchased</th>
                  <th className="text-left py-2">Sponsor</th>
                  <th className="text-right py-2">Expected</th>
                  <th className="text-right py-2">Paid</th>
                  <th className="text-left py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {healthData.slice(0, 20).map((item) => (
                  <tr key={`${item.user_id}-${item.purchased_at}`} className="border-b">
                    <td className="py-2 font-mono text-xs">{item.user_id.substring(0, 8)}...</td>
                    <td className="py-2">{item.current_badge}</td>
                    <td className="py-2 text-right">{item.price_bsk}</td>
                    <td className="py-2">{new Date(item.purchased_at).toLocaleDateString()}</td>
                    <td className="py-2 font-mono text-xs">
                      {item.sponsor_id ? `${item.sponsor_id.substring(0, 8)}...` : '-'}
                    </td>
                    <td className="py-2 text-right">{item.expected_commission.toFixed(2)}</td>
                    <td className="py-2 text-right">
                      {item.commission_paid?.toFixed(2) || '-'}
                    </td>
                    <td className="py-2">
                      {item.status === 'OK' && (
                        <Badge variant="default" className="bg-success text-success-foreground">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      )}
                      {item.status === 'MISSING_COMMISSION' && (
                        <Badge variant="destructive">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Missing
                        </Badge>
                      )}
                      {item.status === 'NO_SPONSOR' && (
                        <Badge variant="secondary">No Sponsor</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No badge purchases found
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
