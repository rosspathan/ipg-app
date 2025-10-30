import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTradingManagement } from "@/hooks/useTradingManagement";
import { TrendingUp, Plus, Power, Edit, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function TradingControlPanel() {
  const { pairs, isLoading } = useTradingManagement();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  if (isLoading) {
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
        </TabsContent>
      </Tabs>
    </div>
  );
}