import { useState } from "react";
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import AdminRoute from "@/components/AdminRoute";

interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId?: number;
  contract?: string;
  icon?: string;
  isListed: boolean;
}

interface TradingPair {
  id: string;
  baseAsset: string;
  quoteAsset: string;
  tickSize: number;
  stepSize: number;
  minNotional: number;
  status: "listed" | "paused" | "delisted";
  orderTypes: string[];
}

interface FeeSettings {
  makerFeePercent: number;
  takerFeePercent: number;
  feeToken: string;
  feeFreePeriods: { start: Date; end: Date }[];
}

function AdminTradingSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pairs");
  const [isAddTokenDialogOpen, setIsAddTokenDialogOpen] = useState(false);
  const [isAddPairDialogOpen, setIsAddPairDialogOpen] = useState(false);

  // Mock data - in production, fetch from Supabase
  const [tokens, setTokens] = useState<Token[]>([
    { id: "1", symbol: "BSK", name: "iSmart Token", decimals: 18, isListed: true },
    { id: "2", symbol: "INR", name: "Indian Rupee", decimals: 2, isListed: true },
    { id: "3", symbol: "BTC", name: "Bitcoin", decimals: 8, chainId: 56, isListed: true },
    { id: "4", symbol: "ETH", name: "Ethereum", decimals: 18, chainId: 56, isListed: true },
  ]);

  const [pairs, setPairs] = useState<TradingPair[]>([
    { id: "1", baseAsset: "BSK", quoteAsset: "INR", tickSize: 0.01, stepSize: 0.1, minNotional: 10, status: "listed", orderTypes: ["market", "limit"] },
    { id: "2", baseAsset: "BTC", quoteAsset: "INR", tickSize: 1, stepSize: 0.00001, minNotional: 100, status: "listed", orderTypes: ["market", "limit"] },
  ]);

  const [feeSettings, setFeeSettings] = useState<FeeSettings>({
    makerFeePercent: 0.10,
    takerFeePercent: 0.10,
    feeToken: "BSK",
    feeFreePeriods: []
  });

  const [tradingMode, setTradingMode] = useState<"LIVE" | "SIM">("SIM");

  const handleSaveFees = () => {
    toast({
      title: "Fees Updated",
      description: "Trading fee settings have been saved successfully",
    });
  };

  const handleTogglePairStatus = (pairId: string) => {
    setPairs(prev => prev.map(pair => {
      if (pair.id === pairId) {
        const newStatus = pair.status === "listed" ? "paused" : "listed";
        return { ...pair, status: newStatus };
      }
      return pair;
    }));
    toast({
      title: "Pair Status Updated",
      description: "Trading pair status has been changed",
    });
  };

  const handleDeletePair = (pairId: string) => {
    setPairs(prev => prev.filter(p => p.id !== pairId));
    toast({
      title: "Pair Deleted",
      description: "Trading pair has been removed",
      variant: "destructive"
    });
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Trading Settings</h1>
            <p className="text-muted-foreground">
              Manage trading pairs, tokens, fees, and execution modes
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pairs">Pairs</TabsTrigger>
              <TabsTrigger value="tokens">Tokens</TabsTrigger>
              <TabsTrigger value="fees">Fees</TabsTrigger>
              <TabsTrigger value="mode">Mode</TabsTrigger>
            </TabsList>

            {/* Pairs Management */}
            <TabsContent value="pairs" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Trading Pairs</CardTitle>
                  <Dialog open={isAddPairDialogOpen} onOpenChange={setIsAddPairDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Pair
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Trading Pair</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Base Asset</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select base asset" />
                            </SelectTrigger>
                            <SelectContent>
                              {tokens.map(t => (
                                <SelectItem key={t.id} value={t.symbol}>{t.symbol}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quote Asset</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select quote asset" />
                            </SelectTrigger>
                            <SelectContent>
                              {tokens.map(t => (
                                <SelectItem key={t.id} value={t.symbol}>{t.symbol}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tick Size</Label>
                            <Input type="number" step="0.01" placeholder="0.01" />
                          </div>
                          <div className="space-y-2">
                            <Label>Step Size</Label>
                            <Input type="number" step="0.01" placeholder="0.1" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Min Notional</Label>
                          <Input type="number" placeholder="10" />
                        </div>
                        <Button className="w-full">Create Pair</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {pairs.map((pair) => (
                      <Card key={pair.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold">{pair.baseAsset}/{pair.quoteAsset}</h3>
                            <p className="text-sm text-muted-foreground">
                              Tick: {pair.tickSize} | Step: {pair.stepSize} | Min: ₹{pair.minNotional}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              pair.status === "listed" ? "bg-success/20 text-success" :
                              pair.status === "paused" ? "bg-warning/20 text-warning" :
                              "bg-destructive/20 text-destructive"
                            }`}>
                              {pair.status}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTogglePairStatus(pair.id)}
                            >
                              {pair.status === "listed" ? (
                                <ToggleRight className="h-5 w-5" />
                              ) : (
                                <ToggleLeft className="h-5 w-5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeletePair(pair.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tokens Management */}
            <TabsContent value="tokens" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Tokens</CardTitle>
                  <Dialog open={isAddTokenDialogOpen} onOpenChange={setIsAddTokenDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Token
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Token</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Symbol</Label>
                          <Input placeholder="BTC" />
                        </div>
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input placeholder="Bitcoin" />
                        </div>
                        <div className="space-y-2">
                          <Label>Decimals</Label>
                          <Input type="number" placeholder="18" />
                        </div>
                        <div className="space-y-2">
                          <Label>Chain ID (optional)</Label>
                          <Input type="number" placeholder="56" />
                        </div>
                        <div className="space-y-2">
                          <Label>Contract Address (optional)</Label>
                          <Input placeholder="0x..." />
                        </div>
                        <Button className="w-full">Add Token</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tokens.map((token) => (
                      <Card key={token.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-bold">{token.symbol}</h3>
                            <p className="text-sm text-muted-foreground">{token.name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {token.decimals} decimals
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Fee Settings */}
            <TabsContent value="fees" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fee Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Maker Fee (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={feeSettings.makerFeePercent}
                        onChange={(e) => setFeeSettings(prev => ({
                          ...prev,
                          makerFeePercent: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Taker Fee (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={feeSettings.takerFeePercent}
                        onChange={(e) => setFeeSettings(prev => ({
                          ...prev,
                          takerFeePercent: parseFloat(e.target.value)
                        }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Fee Token</Label>
                    <Select
                      value={feeSettings.feeToken}
                      onValueChange={(v) => setFeeSettings(prev => ({
                        ...prev,
                        feeToken: v
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BSK">BSK</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveFees} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Fee Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Trading Mode */}
            <TabsContent value="mode" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Trading Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">Current Mode</h3>
                      <p className="text-sm text-muted-foreground">
                        {tradingMode === "LIVE" ? "Live trading with real execution" : "Simulation mode (paper trading)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">SIM</span>
                      <Switch
                        checked={tradingMode === "LIVE"}
                        onCheckedChange={(checked) => {
                          setTradingMode(checked ? "LIVE" : "SIM");
                          toast({
                            title: "Mode Changed",
                            description: `Trading mode set to ${checked ? "LIVE" : "SIM"}`,
                          });
                        }}
                      />
                      <span className="text-sm font-medium">LIVE</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminRoute>
  );
}

export default AdminTradingSettings;
