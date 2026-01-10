import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTradingManagement } from "@/hooks/useTradingManagement";
import { useTradingEngineStatus } from "@/hooks/useTradingEngineStatus";
import { TrendingUp, Plus, Power, Edit, Trash2, AlertTriangle, ShieldCheck, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TradingControlPanel() {
  const { pairs, isLoading } = useTradingManagement();
  const { data: engineStatus, isLoading: statusLoading, refetch: refetchStatus } = useTradingEngineStatus();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [resettingCircuitBreaker, setResettingCircuitBreaker] = useState(false);

  const handleResetCircuitBreaker = async () => {
    setResettingCircuitBreaker(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-circuit-breaker');
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Circuit breaker reset successfully - trading resumed");
        refetchStatus();
      } else {
        throw new Error(data?.error || "Failed to reset circuit breaker");
      }
    } catch (error: any) {
      console.error("Failed to reset circuit breaker:", error);
      toast.error(error.message || "Failed to reset circuit breaker");
    } finally {
      setResettingCircuitBreaker(false);
    }
  };

  if (isLoading || statusLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const activePairs = pairs.filter(p => p.is_active).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trading Control Panel</h1>
        <p className="text-muted-foreground">Manage trading pairs and market settings</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pairs</p>
                <p className="text-2xl font-bold">{pairs.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Pairs</p>
                <p className="text-2xl font-bold">{activePairs}</p>
              </div>
              <Power className="w-8 h-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paused</p>
                <p className="text-2xl font-bold">{pairs.length - activePairs}</p>
              </div>
              <Power className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pairs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pairs">Trading Pairs</TabsTrigger>
          <TabsTrigger value="fees">Fee Settings</TabsTrigger>
          <TabsTrigger value="controls">Market Controls</TabsTrigger>
        </TabsList>

        {/* Trading Pairs Tab */}
        <TabsContent value="pairs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Trading Pairs</CardTitle>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pair
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pairs.map((pair) => (
                  <div key={pair.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-semibold">{pair.base_currency}/{pair.quote_currency}</p>
                        <p className="text-xs text-muted-foreground">
                          Maker: {pair.maker_fee_percent}% | Taker: {pair.taker_fee_percent}%
                        </p>
                      </div>
                      <Badge variant={pair.is_active ? "default" : "secondary"}>
                        {pair.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={pair.is_active} />
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Settings Tab */}
        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <CardTitle>Global Fee Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Configure default maker and taker fees for all trading pairs.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Market Controls Tab */}
        <TabsContent value="controls">
          <div className="space-y-4">
            {/* Circuit Breaker Status Card */}
            <Card className={engineStatus?.circuitBreakerActive ? "border-destructive" : "border-success"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {engineStatus?.circuitBreakerActive ? (
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-success" />
                    )}
                    Circuit Breaker Status
                  </CardTitle>
                  <Badge variant={engineStatus?.circuitBreakerActive ? "destructive" : "default"}>
                    {engineStatus?.circuitBreakerActive ? "ACTIVE - Trading Halted" : "Normal"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Auto Matching</p>
                      <p className="font-semibold">{engineStatus?.autoMatchingEnabled ? "Enabled" : "Disabled"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Trading Status</p>
                      <p className="font-semibold">{engineStatus?.isHalted ? "Halted" : "Active"}</p>
                    </div>
                  </div>
                  
                  {engineStatus?.circuitBreakerActive && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                      <p className="text-sm text-destructive font-medium mb-2">
                        ⚠️ Circuit breaker has been triggered
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Order matching is suspended. Click below to reset and resume trading.
                      </p>
                      <Button 
                        onClick={handleResetCircuitBreaker}
                        disabled={resettingCircuitBreaker}
                        variant="destructive"
                      >
                        {resettingCircuitBreaker ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Resetting...
                          </>
                        ) : (
                          "Reset Circuit Breaker"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Controls Card */}
            <Card>
              <CardHeader>
                <CardTitle>Emergency Controls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button variant="destructive" className="w-full">
                    Halt All Trading
                  </Button>
                  <Button variant="outline" className="w-full">
                    Resume All Trading
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}