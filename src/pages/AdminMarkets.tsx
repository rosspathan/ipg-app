import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCatalog } from '@/hooks/useCatalog';
import AssetLogo from '@/components/AssetLogo';
import { Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';

interface Market {
  id: string;
  base_asset_id: string;
  quote_asset_id: string;
  tick_size: number;
  lot_size: number;
  min_notional: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  base_asset?: any;
  quote_asset?: any;
}

const AdminMarkets = () => {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const { toast } = useToast();
  const { assetsList } = useCatalog();

  const [formData, setFormData] = useState({
    base_asset_id: '',
    quote_asset_id: '',
    tick_size: 0.01,
    lot_size: 0.001,
    min_notional: 10,
    is_active: true,
  });

  useEffect(() => {
    loadMarkets();
  }, []);

  const loadMarkets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('markets')
        .select(`
          *,
          base_asset:assets!markets_base_asset_id_fkey(*),
          quote_asset:assets!markets_quote_asset_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMarkets(data || []);
    } catch (error: any) {
      console.error('Error loading markets:', error);
      toast({
        title: 'Error Loading Markets',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.base_asset_id || !formData.quote_asset_id) {
      toast({
        title: 'Validation Error',
        description: 'Please select both base and quote assets',
        variant: 'destructive',
      });
      return;
    }

    if (formData.base_asset_id === formData.quote_asset_id) {
      toast({
        title: 'Validation Error', 
        description: 'Base and quote assets must be different',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingMarket) {
        const { error } = await supabase
          .from('markets')
          .update(formData)
          .eq('id', editingMarket.id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Market updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('markets')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Market created successfully',
        });
      }

      setIsDialogOpen(false);
      setEditingMarket(null);
      resetForm();
      loadMarkets();
    } catch (error: any) {
      console.error('Error saving market:', error);
      toast({
        title: 'Error Saving Market',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      base_asset_id: '',
      quote_asset_id: '',
      tick_size: 0.01,
      lot_size: 0.001,
      min_notional: 10,
      is_active: true,
    });
  };

  const openEditDialog = (market: Market) => {
    setEditingMarket(market);
    setFormData({
      base_asset_id: market.base_asset_id,
      quote_asset_id: market.quote_asset_id,
      tick_size: market.tick_size,
      lot_size: market.lot_size,
      min_notional: market.min_notional,
      is_active: market.is_active,
    });
    setIsDialogOpen(true);
  };

  const toggleMarketStatus = async (marketId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('markets')
        .update({ is_active: !currentStatus })
        .eq('id', marketId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Market ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
      
      loadMarkets();
    } catch (error: any) {
      console.error('Error updating market status:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const deleteMarket = async (marketId: string) => {
    if (!confirm('Are you sure you want to delete this market? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('markets')
        .delete()
        .eq('id', marketId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Market deleted successfully',
      });
      
      loadMarkets();
    } catch (error: any) {
      console.error('Error deleting market:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="p-6">Loading markets...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Manage Markets</h1>
          <p className="text-muted-foreground">Configure trading pairs and market settings</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0" onClick={() => { setEditingMarket(null); resetForm(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Market
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMarket ? 'Edit Market' : 'Add New Market'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Base Asset</Label>
                  <Select
                    value={formData.base_asset_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, base_asset_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select base asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetsList.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          <div className="flex items-center gap-2">
                            <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                            {asset.symbol} - {asset.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Quote Asset</Label>
                  <Select
                    value={formData.quote_asset_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, quote_asset_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quote asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetsList.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          <div className="flex items-center gap-2">
                            <AssetLogo symbol={asset.symbol} logoUrl={asset.logo_url} size="sm" />
                            {asset.symbol} - {asset.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tick Size</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={formData.tick_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, tick_size: parseFloat(e.target.value) || 0.01 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lot Size</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={formData.lot_size}
                    onChange={(e) => setFormData(prev => ({ ...prev, lot_size: parseFloat(e.target.value) || 0.001 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min Notional</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={formData.min_notional}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_notional: parseFloat(e.target.value) || 10 }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingMarket ? 'Update Market' : 'Create Market'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {markets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No markets configured yet</p>
            </CardContent>
          </Card>
        ) : (
          markets.map((market) => (
            <Card key={market.id}>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center space-x-4">
                    {market.base_asset && market.quote_asset && (
                      <div className="flex -space-x-2">
                        <AssetLogo symbol={market.base_asset.symbol} logoUrl={market.base_asset.logo_url} />
                        <AssetLogo symbol={market.quote_asset.symbol} logoUrl={market.quote_asset.logo_url} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold">
                        {market.base_asset?.symbol || 'Unknown'}/{market.quote_asset?.symbol || 'Unknown'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Tick: {market.tick_size} | Lot: {market.lot_size} | Min: {market.min_notional}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Badge variant={market.is_active ? 'default' : 'secondary'}>
                      {market.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleMarketStatus(market.id, market.is_active)}
                    >
                      {market.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(market)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMarket(market.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminMarkets;