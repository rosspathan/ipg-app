import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LogoUpload from "@/components/LogoUpload";
import { useAssetLogos } from "@/hooks/useAssetLogos";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  contract_address: string;
  decimals: number;
  logo_url: string;
  logo_file_path: string | null;
  logo_file_name: string | null;
  network: string;
  deposit_enabled: boolean;
  withdraw_enabled: boolean;
  trading_enabled: boolean;
  min_trade_amount: number;
  min_withdraw_amount: number;
  max_withdraw_amount: number;
  withdraw_fee: number;
  risk_label: string;
  asset_type: string;
  initial_price: number | null;
  price_currency: string;
}

const AdminAssets = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();
  const { getLogoUrl } = useAssetLogos();

  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    contract_address: '',
    decimals: 18,
    logo_url: '',
    logo_file_path: null as string | null,
    logo_file_name: null as string | null,
    network: 'BEP20',
    deposit_enabled: true,
    withdraw_enabled: true,
    trading_enabled: true,
    min_trade_amount: 0,
    min_withdraw_amount: 0,
    max_withdraw_amount: 999999999,
    withdraw_fee: 0,
    risk_label: 'low',
    asset_type: 'crypto',
    initial_price: null as number | null,
    price_currency: 'USD',
  });

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('symbol');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast({
        title: "Error",
        description: "Failed to load assets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingAsset) {
        const { error } = await supabase
          .from('assets')
          .update(formData)
          .eq('id', editingAsset.id);

        if (error) throw error;

        await supabase.rpc('log_admin_action', {
          p_action: 'asset_updated',
          p_resource_type: 'asset',
          p_resource_id: editingAsset.id,
          p_new_values: formData,
        });

        toast({ title: "Success", description: "Asset updated successfully" });
      } else {
        const { error } = await supabase
          .from('assets')
          .insert([formData]);

        if (error) throw error;

        await supabase.rpc('log_admin_action', {
          p_action: 'asset_created',
          p_resource_type: 'asset',
          p_new_values: formData,
        });

        toast({ title: "Success", description: "Asset created successfully" });
      }

      setShowAddDialog(false);
      setEditingAsset(null);
      resetForm();
      loadAssets();
    } catch (error) {
      console.error('Error saving asset:', error);
      toast({
        title: "Error",
        description: "Failed to save asset",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setFormData({
      symbol: asset.symbol,
      name: asset.name,
      contract_address: asset.contract_address || '',
      decimals: asset.decimals,
      logo_url: asset.logo_url || '',
      logo_file_path: asset.logo_file_path,
      logo_file_name: asset.logo_file_name,
      network: asset.network,
      deposit_enabled: asset.deposit_enabled,
      withdraw_enabled: asset.withdraw_enabled,
      trading_enabled: asset.trading_enabled,
      min_trade_amount: asset.min_trade_amount,
      min_withdraw_amount: asset.min_withdraw_amount,
      max_withdraw_amount: asset.max_withdraw_amount,
      withdraw_fee: asset.withdraw_fee,
      risk_label: asset.risk_label,
      asset_type: asset.asset_type || 'crypto',
      initial_price: asset.initial_price,
      price_currency: asset.price_currency || 'USD',
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete ${asset.symbol}?`)) return;

    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', asset.id);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action: 'asset_deleted',
        p_resource_type: 'asset',
        p_resource_id: asset.id,
      });

      toast({ title: "Success", description: "Asset deleted successfully" });
      loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      contract_address: '',
      decimals: 18,
      logo_url: '',
      logo_file_path: null,
      logo_file_name: null,
      network: 'BEP20',
      deposit_enabled: true,
      withdraw_enabled: true,
      trading_enabled: true,
      min_trade_amount: 0,
      min_withdraw_amount: 0,
      max_withdraw_amount: 999999999,
      withdraw_fee: 0,
      risk_label: 'low',
      asset_type: 'crypto',
      initial_price: null,
      price_currency: 'USD',
    });
  };

  if (loading) {
    return <div className="p-6">Loading assets...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Assets & Tokens</h1>
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) { setEditingAsset(null); resetForm(); }
        }}>
          <DialogTrigger asChild>
            <Button className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="asset_type">Asset Type</Label>
                <Select value={formData.asset_type} onValueChange={(value) => {
                  setFormData({
                    ...formData, 
                    asset_type: value,
                    // Reset network and decimals when switching types
                    network: value === 'fiat' ? 'FIAT' : 'BEP20',
                    decimals: value === 'fiat' ? 2 : 18,
                    contract_address: value === 'fiat' ? '' : formData.contract_address
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="fiat">Fiat Currency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.asset_type === 'fiat' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="initial_price">Initial Price</Label>
                    <Input
                      id="initial_price"
                      type="number"
                      step="0.01"
                      value={formData.initial_price || ''}
                      onChange={(e) => setFormData({ ...formData, initial_price: parseFloat(e.target.value) || null })}
                      placeholder="e.g., 1.00"
                      required={formData.asset_type === 'fiat'}
                    />
                  </div>
                  <div>
                    <Label htmlFor="price_currency">Price Base Currency</Label>
                    <Select
                      value={formData.price_currency}
                      onValueChange={(value) => setFormData({ ...formData, price_currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="BTC">BTC</SelectItem>
                        <SelectItem value="USDT">USDT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formData.asset_type === 'crypto' && (
                <div>
                  <Label htmlFor="contract_address">Contract Address</Label>
                  <Input
                    id="contract_address"
                    value={formData.contract_address}
                    onChange={(e) => setFormData({ ...formData, contract_address: e.target.value })}
                    placeholder="0x..."
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="decimals">Decimals</Label>
                  <Input
                    id="decimals"
                    type="number"
                    value={formData.decimals}
                    onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="network">Network</Label>
                  <Select
                    value={formData.network}
                    onValueChange={(value) => setFormData({ ...formData, network: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formData.asset_type === 'crypto' ? (
                        <>
                          <SelectItem value="BEP20">BEP20</SelectItem>
                          <SelectItem value="ERC20">ERC20</SelectItem>
                          <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                          <SelectItem value="Ethereum">Ethereum</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="FIAT">FIAT</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="INR">INR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <LogoUpload
                assetSymbol={formData.symbol}
                currentLogo={formData.logo_file_path}
                onLogoUpdate={(filePath) => {
                  setFormData({
                    ...formData,
                    logo_file_path: filePath,
                    logo_file_name: filePath ? filePath.split('/').pop() || null : null,
                  });
                }}
                className="mb-4"
              />

              <div>
                <Label htmlFor="logo_url">Legacy Logo URL (fallback)</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                  placeholder="https://... (optional fallback)"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.deposit_enabled}
                    onCheckedChange={(checked) => setFormData({...formData, deposit_enabled: checked})}
                  />
                  <Label>Deposit Enabled</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.withdraw_enabled}
                    onCheckedChange={(checked) => setFormData({...formData, withdraw_enabled: checked})}
                  />
                  <Label>Withdraw Enabled</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.trading_enabled}
                    onCheckedChange={(checked) => setFormData({...formData, trading_enabled: checked})}
                  />
                  <Label>Trading Enabled</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_trade_amount">Min Trade Amount</Label>
                  <Input
                    id="min_trade_amount"
                    type="number"
                    step="0.00000001"
                    value={formData.min_trade_amount}
                    onChange={(e) => setFormData({...formData, min_trade_amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="withdraw_fee">Withdraw Fee</Label>
                  <Input
                    id="withdraw_fee"
                    type="number"
                    step="0.00000001"
                    value={formData.withdraw_fee}
                    onChange={(e) => setFormData({...formData, withdraw_fee: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="min_withdraw_amount">Min Withdraw</Label>
                  <Input
                    id="min_withdraw_amount"
                    type="number"
                    step="0.00000001"
                    value={formData.min_withdraw_amount}
                    onChange={(e) => setFormData({...formData, min_withdraw_amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="max_withdraw_amount">Max Withdraw</Label>
                  <Input
                    id="max_withdraw_amount"
                    type="number"
                    step="0.00000001"
                    value={formData.max_withdraw_amount}
                    onChange={(e) => setFormData({...formData, max_withdraw_amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="risk_label">Risk Label</Label>
                <Select value={formData.risk_label} onValueChange={(value) => setFormData({...formData, risk_label: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAsset ? 'Update' : 'Create'} Asset
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
          <CardTitle>Assets List</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[720px] md:min-w-0">
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type & Price</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        <img 
                          src={getLogoUrl(asset.logo_file_path, asset.logo_url)} 
                          alt={asset.symbol} 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = asset.symbol.charAt(0);
                          }}
                        />
                      </div>
                      <div>
                        <div className="font-medium">{asset.symbol}</div>
                        <div className="text-sm text-muted-foreground">{asset.name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={asset.asset_type === 'fiat' ? 'default' : 'secondary'} className="text-xs">
                        {asset.asset_type === 'fiat' ? 'Fiat' : 'Crypto'}
                      </Badge>
                      {asset.asset_type === 'fiat' && asset.initial_price && (
                        <div className="text-sm text-muted-foreground">
                          {asset.initial_price} {asset.price_currency}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{asset.network}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {asset.deposit_enabled && <Badge variant="secondary" className="text-xs">Deposit</Badge>}
                      {asset.withdraw_enabled && <Badge variant="secondary" className="text-xs">Withdraw</Badge>}
                      {asset.trading_enabled && <Badge variant="secondary" className="text-xs">Trading</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Min Trade: {asset.min_trade_amount}</div>
                      <div>Withdraw: {asset.min_withdraw_amount} - {asset.max_withdraw_amount}</div>
                      <div>Fee: {asset.withdraw_fee}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      asset.risk_label === 'high' ? 'destructive' : 
                      asset.risk_label === 'medium' ? 'secondary' : 'default'
                    }>
                      {asset.risk_label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(asset)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(asset)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAssets;