import * as React from "react";
import { useState, useEffect } from "react";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { FilterChips, FilterGroup } from "@/components/admin/nova/FilterChips";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { AuditTrailViewer } from "@/components/admin/nova/AuditTrailViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Coins, Repeat, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import LogoUpload from "@/components/LogoUpload";
import CryptoLogo from "@/components/CryptoLogo";
import { useAssetLogos } from "@/hooks/useAssetLogos";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  contract_address: string | null;
  decimals: number;
  logo_url: string | null;
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
  is_active: boolean;
}

/**
 * AdminMarketsNova - Assets (Tokens) + Pairs management
 * Two tabs: Tokens and Pairs with Quick List wizard
 */
export default function AdminMarketsNova() {
  const [selectedRecord, setSelectedRecord] = useState<Asset | null>(null);
  const [activeTab, setActiveTab] = useState("tokens");
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [editingToken, setEditingToken] = useState<Asset | null>(null);
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
      if (editingToken) {
        const { error } = await supabase
          .from('assets')
          .update(formData)
          .eq('id', editingToken.id);

        if (error) throw error;

        await supabase.rpc('log_admin_action', {
          p_action: 'asset_updated',
          p_resource_type: 'asset',
          p_resource_id: editingToken.id,
          p_new_values: formData,
        });

        toast({ title: "Success", description: "Token updated successfully" });
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

        toast({ title: "Success", description: "Token created successfully" });
      }

      setShowTokenDialog(false);
      setEditingToken(null);
      resetForm();
      loadAssets();
    } catch (error) {
      console.error('Error saving token:', error);
      toast({
        title: "Error",
        description: "Failed to save token",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingToken(asset);
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
    setShowTokenDialog(true);
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

      toast({ title: "Success", description: "Token deleted successfully" });
      loadAssets();
    } catch (error) {
      console.error('Error deleting token:', error);
      toast({
        title: "Error",
        description: "Failed to delete token",
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

  // Filter assets based on search and active filters
  const filteredAssets = assets.filter(asset => {
    if (searchValue && !asset.symbol.toLowerCase().includes(searchValue.toLowerCase()) && 
        !asset.name.toLowerCase().includes(searchValue.toLowerCase())) {
      return false;
    }
    return true;
  });

  const tokenColumns = [
    {
      key: "symbol",
      label: "Token",
      render: (row: Asset) => (
        <div className="flex items-center gap-2">
          <CryptoLogo 
            symbol={row.symbol}
            logoFilePath={row.logo_file_path}
            fallbackUrl={row.logo_url}
            size={32}
          />
          <div>
            <div className="font-medium">{row.symbol}</div>
            <div className="text-xs text-muted-foreground">{row.name}</div>
          </div>
        </div>
      ),
    },
    { 
      key: "asset_type", 
      label: "Type",
      render: (row: Asset) => (
        <Badge variant="outline" className="capitalize">
          {row.asset_type}
        </Badge>
      )
    },
    { 
      key: "network", 
      label: "Network",
      render: (row: Asset) => (
        <span className="font-mono text-sm">{row.network}</span>
      )
    },
    { 
      key: "contract_address", 
      label: "Contract",
      render: (row: Asset) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.contract_address ? `${row.contract_address.slice(0, 6)}...${row.contract_address.slice(-4)}` : '-'}
        </span>
      )
    },
    { 
      key: "decimals", 
      label: "Decimals",
      render: (row: Asset) => <span className="text-sm">{row.decimals}</span>
    },
    {
      key: "is_active",
      label: "Status",
      render: (row: Asset) => (
        <Badge
          variant={row.is_active ? "default" : "outline"}
          className={
            row.is_active
              ? "bg-success/10 text-success border-success/20"
              : "bg-muted/10 text-muted-foreground border-muted/20"
          }
        >
          {row.is_active ? "Listed" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Asset) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { id: "listed", label: "Listed", value: "Listed" },
        { id: "paused", label: "Paused", value: "Paused" },
      ],
    },
  ];

  // Mock data for pairs
  const pairsData = [
    {
      id: "1",
      pair: "BTC/USDT",
      base: "BTC",
      quote: "USDT",
      status: "Active",
      tickSize: "0.01",
      minNotional: "10",
      feeClass: "A",
    },
    {
      id: "2",
      pair: "ETH/USDT",
      base: "ETH",
      quote: "USDT",
      status: "Active",
      tickSize: "0.01",
      minNotional: "10",
      feeClass: "A",
    },
    {
      id: "3",
      pair: "SOL/USDT",
      base: "SOL",
      quote: "USDT",
      status: "Paused",
      tickSize: "0.001",
      minNotional: "5",
      feeClass: "B",
    },
  ];

  const pairColumns = [
    {
      key: "pair",
      label: "Pair",
      render: (row: any) => (
        <span className="font-medium font-mono">{row.pair}</span>
      ),
    },
    { key: "tickSize", label: "Tick Size" },
    { key: "minNotional", label: "Min Notional" },
    { key: "feeClass", label: "Fee Class" },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row.status === "Active" ? "default" : "outline"}
          className={
            row.status === "Active"
              ? "bg-success/10 text-success border-success/20"
              : "bg-warning/10 text-warning border-warning/20"
          }
        >
          {row.status}
        </Badge>
      ),
    },
  ];

  const mockAuditEntries = [
    {
      id: "1",
      timestamp: "2025-01-15 10:23",
      operator: "Admin Mike",
      action: "Listed BTC",
      changes: [
        { field: "status", before: "Draft", after: "Listed" },
        { field: "decimals", before: null, after: 8 },
      ],
    },
    {
      id: "2",
      timestamp: "2025-01-14 14:10",
      operator: "Admin Sarah",
      action: "Created BTC/USDT pair",
      changes: [
        { field: "tickSize", before: null, after: "0.01" },
        { field: "minNotional", before: null, after: "10" },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-admin-markets" className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-bold text-foreground">
          Markets
        </h1>
        <Button
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90"
          onClick={() => {
            resetForm();
            setEditingToken(null);
            setShowTokenDialog(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Token
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-[hsl(230_28%_13%)] border border-[hsl(225_24%_22%/0.16)]">
          <TabsTrigger value="tokens" className="gap-2">
            <Coins className="w-4 h-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="pairs" className="gap-2">
            <Repeat className="w-4 h-4" />
            Pairs
          </TabsTrigger>
        </TabsList>

        {/* Tokens Tab */}
        <TabsContent value="tokens" className="space-y-4 mt-4">
          <FilterChips
            groups={filterGroups}
            activeFilters={activeFilters}
            onFiltersChange={setActiveFilters}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />

          <DataGridAdaptive
            data={filteredAssets}
            columns={tokenColumns}
            keyExtractor={(item) => item.id}
            renderCard={(item, selected, onSelect) => (
              <RecordCard
                id={item.id}
                title={item.symbol}
                subtitle={item.name}
                fields={[
                  { label: "Network", value: item.network },
                  { label: "Type", value: item.asset_type },
                  { label: "Decimals", value: String(item.decimals) },
                  { 
                    label: "Contract", 
                    value: item.contract_address 
                      ? `${item.contract_address.slice(0, 6)}...${item.contract_address.slice(-4)}`
                      : '-'
                  },
                ]}
                status={{
                  label: item.is_active ? "Listed" : "Inactive",
                  variant: item.is_active ? "success" : "default",
                }}
                actions={[
                  {
                    label: "Edit",
                    icon: Edit,
                    onClick: () => handleEdit(item),
                  },
                  {
                    label: "Delete",
                    icon: Trash2,
                    onClick: () => handleDelete(item),
                    variant: "destructive",
                  },
                ]}
                onClick={() => setSelectedRecord(item)}
                selected={selected}
              />
            )}
            onRowClick={(row) => setSelectedRecord(row)}
            selectable
          />
        </TabsContent>

        {/* Pairs Tab */}
        <TabsContent value="pairs" className="space-y-4 mt-4">
          <FilterChips
            groups={filterGroups}
            activeFilters={activeFilters}
            onFiltersChange={setActiveFilters}
            searchValue={searchValue}
            onSearchChange={setSearchValue}
          />

          <DataGridAdaptive
            data={pairsData}
            columns={pairColumns}
            keyExtractor={(item) => item.id}
            renderCard={(item, selected, onSelect) => (
              <RecordCard
                id={item.id}
                title={item.pair}
                subtitle={`${item.base} / ${item.quote}`}
                fields={[
                  { label: "Tick Size", value: item.tickSize },
                  { label: "Fee Class", value: item.feeClass },
                ]}
                status={{
                  label: item.status,
                  variant: item.status === "Active" ? "success" : "warning",
                }}
                onClick={() => setSelectedRecord(item)}
                selected={selected}
              />
            )}
            onRowClick={(row) => setSelectedRecord(row)}
            selectable
          />
        </TabsContent>
      </Tabs>

      {/* Token Add/Edit Dialog */}
      <Dialog open={showTokenDialog} onOpenChange={(open) => {
        setShowTokenDialog(open);
        if (!open) { 
          setEditingToken(null); 
          resetForm(); 
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingToken ? 'Edit Token' : 'Add New Token'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="symbol">Symbol *</Label>
                <Input
                  id="symbol"
                  value={formData.symbol}
                  onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                  placeholder="BTC"
                  required
                />
              </div>
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Bitcoin"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="asset_type">Asset Type *</Label>
              <Select value={formData.asset_type} onValueChange={(value) => {
                setFormData({
                  ...formData, 
                  asset_type: value,
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

            {formData.asset_type === 'crypto' && (
              <div>
                <Label htmlFor="contract_address">Contract Address</Label>
                <Input
                  id="contract_address"
                  value={formData.contract_address}
                  onChange={(e) => setFormData({ ...formData, contract_address: e.target.value })}
                  placeholder="0x..."
                  className="font-mono text-sm"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="network">Network *</Label>
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
                        <SelectItem value="BEP20">BEP20 (BSC)</SelectItem>
                        <SelectItem value="ERC20">ERC20 (Ethereum)</SelectItem>
                        <SelectItem value="Bitcoin">Bitcoin</SelectItem>
                        <SelectItem value="Ethereum">Ethereum</SelectItem>
                        <SelectItem value="Solana">Solana</SelectItem>
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
              <div>
                <Label htmlFor="decimals">Decimals *</Label>
                <Input
                  id="decimals"
                  type="number"
                  value={formData.decimals}
                  onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) })}
                  required
                  min="0"
                  max="18"
                />
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
            />

            <div>
              <Label htmlFor="logo_url">Fallback Logo URL</Label>
              <Input
                id="logo_url"
                value={formData.logo_url}
                onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                placeholder="https://... (optional)"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.trading_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, trading_enabled: checked})}
                />
                <Label className="text-xs">Trading</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.deposit_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, deposit_enabled: checked})}
                />
                <Label className="text-xs">Deposit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.withdraw_enabled}
                  onCheckedChange={(checked) => setFormData({...formData, withdraw_enabled: checked})}
                />
                <Label className="text-xs">Withdraw</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTokenDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingToken ? 'Update Token' : 'Create Token'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <DetailSheet
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        title={`${selectedRecord?.symbol} - ${selectedRecord?.name}`}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b">
              <CryptoLogo 
                symbol={selectedRecord.symbol}
                logoFilePath={selectedRecord.logo_file_path}
                fallbackUrl={selectedRecord.logo_url}
                size={48}
              />
              <div>
                <h3 className="text-lg font-semibold">{selectedRecord.symbol}</h3>
                <p className="text-sm text-muted-foreground">{selectedRecord.name}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Token Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="text-sm text-foreground capitalize">{selectedRecord.asset_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Network</p>
                  <p className="text-sm text-foreground font-mono">{selectedRecord.network}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Decimals</p>
                  <p className="text-sm text-foreground">{selectedRecord.decimals}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={selectedRecord.is_active ? "default" : "outline"}>
                    {selectedRecord.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {selectedRecord.contract_address && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Contract Address</p>
                    <p className="text-sm text-foreground font-mono break-all">{selectedRecord.contract_address}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Trading Settings</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Trading</p>
                  <p className="text-sm">{selectedRecord.trading_enabled ? '✓ Enabled' : '✗ Disabled'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deposit</p>
                  <p className="text-sm">{selectedRecord.deposit_enabled ? '✓ Enabled' : '✗ Disabled'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Withdraw</p>
                  <p className="text-sm">{selectedRecord.withdraw_enabled ? '✓ Enabled' : '✗ Disabled'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Min Trade</p>
                  <p className="text-sm">{selectedRecord.min_trade_amount}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
