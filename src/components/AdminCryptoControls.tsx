import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
  min_withdraw_amount: number;
  max_withdraw_amount: number;
  withdraw_fee: number;
  network: string;
}

const AdminCryptoControls = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assets')
        .select('id, symbol, name, deposit_enabled, withdraw_enabled, min_withdraw_amount, max_withdraw_amount, withdraw_fee, network')
        .eq('is_active', true)
        .order('symbol');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast({
        title: "Error",
        description: "Failed to load crypto assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAsset = async (assetId: string, updates: Partial<Asset>) => {
    try {
      const { error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', assetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Crypto settings updated successfully",
      });

      loadAssets();
    } catch (error) {
      console.error('Error updating asset:', error);
      toast({
        title: "Error",
        description: "Failed to update crypto settings",
        variant: "destructive",
      });
    }
  };

  const saveEditingAsset = () => {
    if (!editingAsset) return;
    
    updateAsset(editingAsset.id, {
      min_withdraw_amount: editingAsset.min_withdraw_amount,
      max_withdraw_amount: editingAsset.max_withdraw_amount,
      withdraw_fee: editingAsset.withdraw_fee,
    });
    setEditingAsset(null);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading crypto controls...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl">Crypto Deposit & Withdrawal Controls</CardTitle>
            <Button size="sm" variant="outline" onClick={loadAssets}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead className="text-center">Deposits</TableHead>
                  <TableHead className="text-center">Withdrawals</TableHead>
                  <TableHead>Min Withdraw</TableHead>
                  <TableHead>Max Withdraw</TableHead>
                  <TableHead>Withdraw Fee</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{asset.symbol}</div>
                        <div className="text-xs text-muted-foreground">{asset.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{asset.network}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={asset.deposit_enabled}
                        onCheckedChange={(checked) => updateAsset(asset.id, { deposit_enabled: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={asset.withdraw_enabled}
                        onCheckedChange={(checked) => updateAsset(asset.id, { withdraw_enabled: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      {editingAsset?.id === asset.id ? (
                        <Input
                          type="number"
                          value={editingAsset.min_withdraw_amount}
                          onChange={(e) => setEditingAsset({...editingAsset, min_withdraw_amount: parseFloat(e.target.value)})}
                          className="w-24"
                        />
                      ) : (
                        <span className="text-sm">{asset.min_withdraw_amount}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingAsset?.id === asset.id ? (
                        <Input
                          type="number"
                          value={editingAsset.max_withdraw_amount}
                          onChange={(e) => setEditingAsset({...editingAsset, max_withdraw_amount: parseFloat(e.target.value)})}
                          className="w-24"
                        />
                      ) : (
                        <span className="text-sm">{asset.max_withdraw_amount}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingAsset?.id === asset.id ? (
                        <Input
                          type="number"
                          value={editingAsset.withdraw_fee}
                          onChange={(e) => setEditingAsset({...editingAsset, withdraw_fee: parseFloat(e.target.value)})}
                          className="w-24"
                        />
                      ) : (
                        <span className="text-sm">{asset.withdraw_fee}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingAsset?.id === asset.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" onClick={saveEditingAsset}>
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingAsset(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setEditingAsset(asset)}>
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {assets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No crypto assets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCryptoControls;
