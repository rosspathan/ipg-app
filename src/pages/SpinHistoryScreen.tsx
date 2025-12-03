import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Trophy, 
  Target,
  Gift,
  Download,
  Sparkles
} from "lucide-react";
import { useSpinHistory, SpinFilterType } from "@/hooks/useSpinHistory";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SpinHistoryList } from "@/components/spin/SpinHistoryList";

export default function SpinHistoryScreen() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SpinFilterType>('all');
  const { history, stats, isLoading } = useSpinHistory(filter, 100);

  const exportToCSV = () => {
    if (history.length === 0) return;
    
    const headers = ['Date', 'Bet (BSK)', 'Multiplier', 'Payout (BSK)', 'Fee (BSK)', 'Profit Fee (BSK)', 'Net Change (BSK)', 'Type', 'Server Seed Hash'];
    const rows = history.map(spin => [
      new Date(spin.created_at).toISOString(),
      spin.bet_bsk,
      spin.multiplier,
      spin.payout_bsk,
      spin.spin_fee_bsk,
      spin.profit_fee_bsk || 0,
      spin.net_change_bsk,
      spin.was_free_spin ? 'Free' : 'Paid',
      spin.server_seed_hash
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spin-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterCounts = {
    all: stats.totalSpins,
    wins: stats.totalWins,
    losses: stats.totalLosses,
    free: stats.freeSpinsUsed
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/app/programs/spin")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Spin History</h1>
            <p className="text-sm text-muted-foreground">Your complete spinning record</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={history.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="overflow-hidden border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Spins</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalSpins}</div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Wagered</span>
              </div>
              <div className="text-2xl font-bold">{stats.totalWagered.toFixed(0)}</div>
              <div className="text-[10px] text-muted-foreground">BSK</div>
            </CardContent>
          </Card>

          <Card className={`overflow-hidden border-border/50 ${
            stats.netProfitLoss >= 0 ? 'bg-emerald-500/5' : 'bg-red-500/5'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {stats.netProfitLoss >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">Net P/L</span>
              </div>
              <div className={`text-2xl font-bold ${
                stats.netProfitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}>
                {stats.netProfitLoss >= 0 ? '+' : ''}{stats.netProfitLoss.toFixed(0)}
              </div>
              <div className="text-[10px] text-muted-foreground">BSK</div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/50 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Win Rate</span>
              </div>
              <div className="text-2xl font-bold">{stats.winRate.toFixed(0)}%</div>
              <div className="text-[10px] text-muted-foreground">{stats.totalWins}W / {stats.totalLosses}L</div>
            </CardContent>
          </Card>
        </div>

        {/* Best Win Banner */}
        {stats.bestWin > 0 && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-orange-500/20 border border-yellow-500/30 p-4 mb-6">
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Best Win</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  +{stats.bestWin.toFixed(0)} BSK
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {(['all', 'wins', 'losses', 'free'] as SpinFilterType[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={`gap-1.5 shrink-0 ${
                filter === f ? '' : 'bg-card/50'
              }`}
            >
              {f === 'wins' && <TrendingUp className="h-3.5 w-3.5" />}
              {f === 'losses' && <TrendingDown className="h-3.5 w-3.5" />}
              {f === 'free' && <Gift className="h-3.5 w-3.5" />}
              <span className="capitalize">{f}</span>
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] h-5">
                {filterCounts[f]}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Spin History List - Trust Wallet Style */}
        <SpinHistoryList history={history} isLoading={isLoading} />
      </div>
    </div>
  );
}
