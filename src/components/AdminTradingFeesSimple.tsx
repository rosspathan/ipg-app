import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Settings, Percent, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AdminTradingFeesSimple = () => {
  const [globalSettings, setGlobalSettings] = useState({
    maker_fee_bps: "10", // 0.10%
    taker_fee_bps: "15", // 0.15%
    fee_collect_asset: "quote",
    min_fee: "0",
    max_fee: "0"
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    // For now, just save to local state
    // Once migration is processed, this will save to database
    toast({
      title: "Settings Saved",
      description: "Trading fee settings updated (stored locally until database migration completes)",
    });
    setDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Trading fee system is being set up. Full functionality will be available once the database migration completes.
        </AlertDescription>
      </Alert>

      {/* Global Fee Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Global Trading Fee Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Default maker/taker fees for all markets
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Settings className="h-4 w-4 mr-2" />
                  Configure Fees
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Global Fee Configuration</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Maker Fee (basis points)</Label>
                      <Input
                        type="number"
                        placeholder="10"
                        value={globalSettings.maker_fee_bps}
                        onChange={(e) => setGlobalSettings(prev => ({ ...prev, maker_fee_bps: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">10 bps = 0.10%</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Taker Fee (basis points)</Label>
                      <Input
                        type="number"
                        placeholder="15"
                        value={globalSettings.taker_fee_bps}
                        onChange={(e) => setGlobalSettings(prev => ({ ...prev, taker_fee_bps: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">15 bps = 0.15%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Fee (USDT)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={globalSettings.min_fee}
                        onChange={(e) => setGlobalSettings(prev => ({ ...prev, min_fee: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Fee (USDT)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        value={globalSettings.max_fee}
                        onChange={(e) => setGlobalSettings(prev => ({ ...prev, max_fee: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave}>
                      Save Settings
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{globalSettings.maker_fee_bps}</div>
              <div className="text-sm text-muted-foreground">Maker Fee (bps)</div>
              <div className="text-xs text-muted-foreground">{(parseInt(globalSettings.maker_fee_bps) / 100).toFixed(2)}%</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{globalSettings.taker_fee_bps}</div>
              <div className="text-sm text-muted-foreground">Taker Fee (bps)</div>
              <div className="text-xs text-muted-foreground">{(parseInt(globalSettings.taker_fee_bps) / 100).toFixed(2)}%</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">Quote</div>
              <div className="text-sm text-muted-foreground">Collection Asset</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-primary">BSK</div>
              <div className="text-sm text-muted-foreground">Discount Asset</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Overrides Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            Market Fee Overrides
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Custom fee rates for specific trading pairs (coming soon)
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Percent className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Market-specific overrides will be available after migration completes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};