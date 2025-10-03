import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  BarChart3, Coins, GitBranch, Shield, Settings, 
  TrendingUp, FileText, Zap, Plus, Pause, Play,
  AlertCircle, CheckCircle, XCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { CardLane } from "@/components/admin/nova/CardLane";
import { RecordCard } from "@/components/admin/nova/RecordCard";

export default function AdminTradingControlNova() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Data states - using any until types regenerate
  const [tokens, setTokens] = useState<any[]>([]);
  const [pairs, setPairs] = useState<any[]>([]);
  const [executionSettings, setExecutionSettings] = useState<any | null>(null);

  // KPI states
  const [stats, setStats] = useState({
    totalPairs: 0,
    listedPairs: 0,
    pausedPairs: 0,
    volume24h: 0,
    mode: 'SIM'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load tokens
      const { data: tokensData, error: tokensError } = await supabase
        .from('trading_tokens' as any)
        .select('*')
        .order('symbol');
      
      if (tokensError) throw tokensError;
      setTokens(tokensData || []);

      // Load pairs
      const { data: pairsData, error: pairsError } = await supabase
        .from('trading_pairs' as any)
        .select('*')
        .order('symbol');
      
      if (pairsError) throw pairsError;
      setPairs(pairsData || []);

      // Load execution settings
      const { data: execData, error: execError } = await supabase
        .from('trading_execution_settings' as any)
        .select('*')
        .eq('region', 'GLOBAL')
        .maybeSingle();
      
      if (execError) throw execError;
      setExecutionSettings(execData);

      // Calculate stats
      const listedCount = pairsData?.filter((p: any) => p.visibility === 'listed').length || 0;
      const pausedCount = pairsData?.filter((p: any) => p.visibility === 'paused').length || 0;
      const totalVolume = pairsData?.reduce((sum: number, p: any) => sum + (p.volume_24h || 0), 0) || 0;

      let mode = 'SIM';
      if (execData && typeof execData === 'object') {
        const data = execData as any;
        if (data.mode && typeof data.mode === 'string') {
          mode = data.mode;
        }
      }

      setStats({
        totalPairs: pairsData?.length || 0,
        listedPairs: listedCount,
        pausedPairs: pausedCount,
        volume24h: totalVolume,
        mode
      });

    } catch (error: any) {
      console.error('Error loading trading data:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePauseAll = async () => {
    try {
      const { error } = await supabase
        .from('trading_pairs' as any)
        .update({ visibility: 'paused' })
        .eq('visibility', 'listed');

      if (error) throw error;

      toast({
        title: "Emergency Pause Activated",
        description: "All trading pairs have been paused",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleTogglePair = async (pairId: string, currentVisibility: string) => {
    try {
      const newVisibility = currentVisibility === 'listed' ? 'paused' : 'listed';
      
      const { error } = await supabase
        .from('trading_pairs' as any)
        .update({ visibility: newVisibility })
        .eq('id', pairId);

      if (error) throw error;

      toast({
        title: `Pair ${newVisibility}`,
        description: `Trading pair status updated`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 space-y-6" data-testid="admin-trade-overview">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">Trading Control Center</h1>
        <p className="text-sm text-muted-foreground">
          Manage spot trading pairs, fees, execution, and risk controls
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 lg:grid-cols-9 w-full">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tokens" data-testid="admin-trade-tokens">
            <Coins className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Tokens</span>
          </TabsTrigger>
          <TabsTrigger value="pairs" data-testid="admin-trade-pairs">
            <GitBranch className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Pairs</span>
          </TabsTrigger>
          <TabsTrigger value="fees" data-testid="admin-trade-fees">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Fees</span>
          </TabsTrigger>
          <TabsTrigger value="execution" data-testid="admin-trade-execution">
            <Zap className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Execution</span>
          </TabsTrigger>
          <TabsTrigger value="risk" data-testid="admin-trade-risk">
            <Shield className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Risk</span>
          </TabsTrigger>
          <TabsTrigger value="promos" data-testid="admin-trade-promos">
            <TrendingUp className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Promos</span>
          </TabsTrigger>
          <TabsTrigger value="ui" data-testid="admin-trade-ui">
            <Settings className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">UI</span>
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="admin-trade-audit">
            <FileText className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Audit</span>
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <CardLane>
            <KPIStat
              label="Listed Pairs"
              value={stats.listedPairs}
              icon={<CheckCircle className="h-5 w-5" />}
            />
            <KPIStat
              label="Paused Pairs"
              value={stats.pausedPairs}
              icon={<Pause className="h-5 w-5" />}
            />
            <KPIStat
              label="24h Volume"
              value={`₹${(stats.volume24h / 1000000).toFixed(2)}M`}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <KPIStat
              label="Mode"
              value={stats.mode}
              icon={<Zap className="h-5 w-5" />}
              variant={stats.mode === 'LIVE' ? 'warning' : 'default'}
            />
          </CardLane>

          {/* Emergency Controls */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Emergency Kill-Switch</h3>
                <p className="text-sm text-muted-foreground">
                  Immediately pause all trading pairs (global circuit breaker)
                </p>
              </div>
              <Button
                variant="destructive"
                size="lg"
                onClick={handlePauseAll}
              >
                <AlertCircle className="h-5 w-5 mr-2" />
                Pause All Trading
              </Button>
            </div>
          </Card>

          {/* Pairs Quick View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Trading Pairs</h3>
              <Button onClick={() => setActiveTab('pairs')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pair
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : pairs.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No trading pairs configured</p>
                <Button onClick={() => setActiveTab('pairs')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Pair
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3">
                {pairs.map((pair: any) => (
                  <RecordCard
                    key={pair.id}
                    id={pair.id}
                    title={pair.symbol}
                    subtitle={`Tick: ${pair.tick_size} | Min: ₹${pair.min_notional}`}
                    status={{
                      label: pair.visibility,
                      variant: 
                        pair.visibility === 'listed' ? 'success' :
                        pair.visibility === 'paused' ? 'warning' :
                        'danger'
                    }}
                    fields={[
                      { label: 'Last Price', value: `₹${pair.last_price || 0}` },
                      { label: '24h Change', value: `${pair.price_change_24h || 0}%` },
                      { label: '24h Volume', value: `₹${((pair.volume_24h || 0) / 1000).toFixed(0)}K` }
                    ]}
                    actions={[
                      {
                        label: pair.visibility === 'listed' ? 'Pause' : 'Resume',
                        icon: pair.visibility === 'listed' ? Pause : Play,
                        onClick: () => handleTogglePair(pair.id, pair.visibility),
                        variant: 'default'
                      }
                    ]}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TOKENS TAB */}
        <TabsContent value="tokens" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Tokens</h3>
            <Button onClick={() => toast({ title: "Coming soon", description: "Token management UI will be added" })}>
              <Plus className="h-4 w-4 mr-2" />
              Add Token
            </Button>
          </div>

          {tokens.length === 0 ? (
            <Card className="p-8 text-center">
              <Coins className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No tokens configured</p>
            </Card>
          ) : (
            <div className="grid gap-3">
              {tokens.map((token: any) => (
                <RecordCard
                  key={token.id}
                  id={token.id}
                  title={token.symbol}
                  subtitle={token.name}
                  status={{
                    label: token.status,
                    variant: token.status === 'listed' ? 'success' : 'default'
                  }}
                  fields={[
                    { label: 'Decimals', value: token.decimals },
                    { label: 'Status', value: token.status }
                  ]}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* PAIRS TAB */}
        <TabsContent value="pairs" className="space-y-4">
          <Card className="p-6">
            <p className="text-muted-foreground">Pairs management interface coming soon...</p>
          </Card>
        </TabsContent>

        {/* FEES TAB */}
        <TabsContent value="fees" className="space-y-4">
          <Card className="p-6">
            <p className="text-muted-foreground">Fee schedules management coming soon...</p>
          </Card>
        </TabsContent>

        {/* EXECUTION TAB */}
        <TabsContent value="execution" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Execution Settings</h3>
            {executionSettings ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">Region</p>
                    <p className="text-sm text-muted-foreground">{executionSettings.region}</p>
                  </div>
                  <Badge variant={executionSettings.mode === 'LIVE' ? 'default' : 'secondary'}>
                    {executionSettings.mode}
                  </Badge>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="font-medium mb-2">Adapter</p>
                  <p className="text-sm text-muted-foreground">{executionSettings.adapter}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No execution settings configured</p>
            )}
          </Card>
        </TabsContent>

        {/* RISK TAB */}
        <TabsContent value="risk" className="space-y-4">
          <Card className="p-6">
            <p className="text-muted-foreground">Risk controls coming soon...</p>
          </Card>
        </TabsContent>

        {/* PROMOS TAB */}
        <TabsContent value="promos" className="space-y-4">
          <Card className="p-6">
            <p className="text-muted-foreground">Promotions coming soon...</p>
          </Card>
        </TabsContent>

        {/* UI TAB */}
        <TabsContent value="ui" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">UI Defaults</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">Candles Default</p>
                  <p className="text-sm text-muted-foreground">
                    Charts are OFF by default (user must toggle)
                  </p>
                </div>
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" />
                  OFF (Fixed)
                </Badge>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* AUDIT TAB */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="p-6">
            <p className="text-muted-foreground">Audit logs coming soon...</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}