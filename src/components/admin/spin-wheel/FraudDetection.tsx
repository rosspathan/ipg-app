import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Users, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export function FraudDetection() {
  const { data: fraudAlerts, isLoading } = useQuery({
    queryKey: ['fraud-detection'],
    queryFn: async () => {
      // Get all spins
      const { data: spins } = await supabase
        .from('ismart_spins')
        .select('user_id, bet_bsk, payout_bsk, multiplier, created_at, client_seed')
        .order('created_at', { ascending: false });

      if (!spins) return { alerts: [], stats: { totalChecked: 0, flagged: 0, suspicious: 0 } };

      const alerts: any[] = [];
      const userActivity = new Map<string, any[]>();

      // Group by user
      spins.forEach(spin => {
        if (!userActivity.has(spin.user_id)) {
          userActivity.set(spin.user_id, []);
        }
        userActivity.get(spin.user_id)!.push(spin);
      });

      // Analyze patterns
      userActivity.forEach((userSpins, userId) => {
        // Check for suspicious patterns
        
        // 1. Rapid spinning (more than 10 spins in 1 minute)
        const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
        const recentSpins = userSpins.filter(s => s.created_at > oneMinuteAgo);
        if (recentSpins.length > 10) {
          alerts.push({
            userId,
            type: 'rapid_activity',
            severity: 'high',
            description: `${recentSpins.length} spins in last minute`,
            timestamp: new Date().toISOString()
          });
        }

        // 2. Consistent high wins (>5 consecutive wins above 3x)
        let consecutiveHighWins = 0;
        userSpins.slice(0, 20).forEach(spin => {
          if (Number(spin.multiplier) >= 3) {
            consecutiveHighWins++;
          } else {
            consecutiveHighWins = 0;
          }
        });
        if (consecutiveHighWins >= 5) {
          alerts.push({
            userId,
            type: 'unusual_win_rate',
            severity: 'medium',
            description: `${consecutiveHighWins} consecutive high-value wins`,
            timestamp: new Date().toISOString()
          });
        }

        // 3. Identical client seeds (potential replay attack)
        const seeds = new Set(userSpins.map(s => s.client_seed));
        if (seeds.size < userSpins.length * 0.5 && userSpins.length > 10) {
          alerts.push({
            userId,
            type: 'seed_reuse',
            severity: 'high',
            description: `Only ${seeds.size} unique seeds for ${userSpins.length} spins`,
            timestamp: new Date().toISOString()
          });
        }

        // 4. Abnormal betting patterns (sudden large bets)
        const avgBet = userSpins.reduce((sum, s) => sum + Number(s.bet_bsk), 0) / userSpins.length;
        const largeBets = userSpins.filter(s => Number(s.bet_bsk) > avgBet * 5);
        if (largeBets.length > 0 && userSpins.length > 20) {
          alerts.push({
            userId,
            type: 'abnormal_betting',
            severity: 'low',
            description: `${largeBets.length} bets >5x average (${avgBet.toFixed(0)} BSK)`,
            timestamp: new Date().toISOString()
          });
        }

        // 5. Extremely high win rate
        const wins = userSpins.filter(s => Number(s.multiplier) > 1).length;
        const winRate = (wins / userSpins.length) * 100;
        if (winRate > 70 && userSpins.length > 50) {
          alerts.push({
            userId,
            type: 'high_win_rate',
            severity: 'high',
            description: `${winRate.toFixed(1)}% win rate over ${userSpins.length} spins`,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Sort by severity
      const severityOrder = { high: 3, medium: 2, low: 1 };
      alerts.sort((a, b) => severityOrder[b.severity as keyof typeof severityOrder] - severityOrder[a.severity as keyof typeof severityOrder]);

      return {
        alerts: alerts.slice(0, 50), // Top 50 alerts
        stats: {
          totalChecked: userActivity.size,
          flagged: new Set(alerts.map(a => a.userId)).size,
          suspicious: alerts.length
        }
      };
    },
    refetchInterval: 60000 // Check every minute
  });

  if (isLoading || !fraudAlerts) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fraud Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'rapid_activity': return <Activity className="h-4 w-4" />;
      case 'seed_reuse': return <Shield className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users Checked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fraudAlerts.stats.totalChecked}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{fraudAlerts.stats.flagged}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fraudAlerts.stats.suspicious}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Fraud Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fraudAlerts.alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No suspicious activity detected</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fraudAlerts.alerts.map((alert: any, idx: number) => (
                <div key={idx} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(alert.type)}
                      <div>
                        <p className="font-medium capitalize">{alert.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                    </div>
                    <Badge variant={getSeverityColor(alert.severity) as any}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    User: {alert.userId.substring(0, 8)}... | {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
