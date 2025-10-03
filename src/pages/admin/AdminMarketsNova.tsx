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
  base_asset?: Asset;
  quote_asset?: Asset;
}

/**
 * AdminMarketsNova - Assets (Tokens) + Pairs management
 * Two tabs: Tokens and Pairs with Quick List wizard
 */
export default function AdminMarketsNova() {
  const [selectedRecord, setSelectedRecord] = useState<Asset | Market | null>(null);
  const [activeTab, setActiveTab] = useState("tokens");
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [showPairDialog, setShowPairDialog] = useState(false);
  const [editingToken, setEditingToken] = useState<Asset | null>(null);
  const [editingPair, setEditingPair] = useState<Market | null>(null);
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

  const [pairFormData, setPairFormData] = useState({
    base_asset_id: '',
    quote_asset_id: '',
    min_notional: 10,
    is_active: true,
  });

  useEffect(() => {
    loadAssets();
    loadMarkets();
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

  const loadMarkets = async () => {
    try {
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
    } catch (error) {
      console.error('Error loading markets:', error);
      toast({
        title: "Error",
        description: "Failed to load markets",
        variant: "destructive",
      });
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

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPair) {
        const { error } = await supabase
          .from('markets')
          .update(pairFormData)
          .eq('id', editingPair.id);

        if (error) throw error;

        await supabase.rpc('log_admin_action', {
          p_action: 'market_updated',
          p_resource_type: 'market',
          p_resource_id: editingPair.id,
          p_new_values: pairFormData,
        });

        toast({ title: "Success", description: "Trading pair updated successfully" });
      } else {
        const { error } = await supabase
          .from('markets')
          .insert([pairFormData]);

        if (error) throw error;

        await supabase.rpc('log_admin_action', {
          p_action: 'market_created',
          p_resource_type: 'market',
          p_new_values: pairFormData,
        });

        toast({ title: "Success", description: "Trading pair created successfully" });
      }

      setShowPairDialog(false);
      setEditingPair(null);
      resetPairForm();
      loadMarkets();
    } catch (error) {
      console.error('Error saving pair:', error);
      toast({
        title: "Error",
        description: "Failed to save trading pair",
        variant: "destructive",
      });
    }
  };

  const handleEditPair = (market: Market) => {
    setEditingPair(market);
    setPairFormData({
      base_asset_id: market.base_asset_id,
      quote_asset_id: market.quote_asset_id,
      min_notional: market.min_notional,
      is_active: market.is_active,
    });
    setShowPairDialog(true);
  };

  const handleDeletePair = async (market: Market) => {
    if (!confirm(`Are you sure you want to delete this trading pair?`)) return;

    try {
      const { error } = await supabase
        .from('markets')
        .delete()
        .eq('id', market.id);

      if (error) throw error;

      await supabase.rpc('log_admin_action', {
        p_action: 'market_deleted',
        p_resource_type: 'market',
        p_resource_id: market.id,
      });

      toast({ title: "Success", description: "Trading pair deleted successfully" });
      loadMarkets();
    } catch (error) {
      console.error('Error deleting pair:', error);
      toast({
        title: "Error",
        description: "Failed to delete trading pair",
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

  const resetPairForm = () => {
    setPairFormData({
      base_asset_id: '',
      quote_asset_id: '',
      min_notional: 10,
      is_active: true,
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

  const pairColumns = [
    {
      key: "pair",
      label: "Pair",
      render: (row: Market) => {
        const baseAsset = row.base_asset || assets.find(a => a.id === row.base_asset_id);
        const quoteAsset = row.quote_asset || assets.find(a => a.id === row.quote_asset_id);
        return (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              <CryptoLogo 
                symbol={baseAsset?.symbol || '?'}
                logoFilePath={baseAsset?.logo_file_path}
                fallbackUrl={baseAsset?.logo_url}
                size={24}
                className="ring-2 ring-background"
              />
              <CryptoLogo 
                symbol={quoteAsset?.symbol || '?'}
                logoFilePath={quoteAsset?.logo_file_path}
                fallbackUrl={quoteAsset?.logo_url}
                size={24}
                className="ring-2 ring-background"
              />
            </div>
            <span className="font-medium font-mono">
              {baseAsset?.symbol}/{quoteAsset?.symbol}
            </span>
          </div>
        );
      },
    },
    { 
      key: "tick_size", 
      label: "Tick Size",
      render: (row: Market) => <span className="font-mono text-sm">{row.tick_size}</span>
    },
    { 
      key: "lot_size", 
      label: "Lot Size",
      render: (row: Market) => <span className="font-mono text-sm">{row.lot_size}</span>
    },
    { 
      key: "min_notional", 
      label: "Min Notional",
      render: (row: Market) => <span className="font-mono text-sm">{row.min_notional}</span>
    },
    {
      key: "is_active",
      label: "Status",
      render: (row: Market) => (
        <Badge
          variant={row.is_active ? "default" : "outline"}
          className={
            row.is_active
              ? "bg-success/10 text-success border-success/20"
              : "bg-muted/10 text-muted-foreground border-muted/20"
          }
        >
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Market) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEditPair(row);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePair(row);
            }}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
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
          <div className="flex items-center justify-between mb-4">
            <FilterChips
              groups={filterGroups}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
            />
            <Button
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 ml-2"
              onClick={() => {
                resetPairForm();
                setEditingPair(null);
                setShowPairDialog(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Pair
            </Button>
          </div>

          <DataGridAdaptive
            data={markets}
            columns={pairColumns}
            keyExtractor={(item) => item.id}
            renderCard={(item, selected, onSelect) => {
              const baseAsset = item.base_asset || assets.find(a => a.id === item.base_asset_id);
              const quoteAsset = item.quote_asset || assets.find(a => a.id === item.quote_asset_id);
              return (
                <RecordCard
                  id={item.id}
                  title={`${baseAsset?.symbol}/${quoteAsset?.symbol}`}
                  subtitle={`${baseAsset?.name} / ${quoteAsset?.name}`}
                  fields={[
                    { label: "Tick Size", value: String(item.tick_size) },
                    { label: "Lot Size", value: String(item.lot_size) },
                    { label: "Min Notional", value: String(item.min_notional) },
                  ]}
                  status={{
                    label: item.is_active ? "Active" : "Inactive",
                    variant: item.is_active ? "success" : "default",
                  }}
                  actions={[
                    {
                      label: "Edit",
                      icon: Edit,
                      onClick: () => handleEditPair(item),
                    },
                    {
                      label: "Delete",
                      icon: Trash2,
                      onClick: () => handleDeletePair(item),
                      variant: "destructive",
                    },
                  ]}
                  onClick={() => setSelectedRecord(item)}
                  selected={selected}
                />
              );
            }}
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

      {/* Pair Add/Edit Dialog */}
      <Dialog open={showPairDialog} onOpenChange={(open) => {
        setShowPairDialog(open);
        if (!open) { 
          setEditingPair(null); 
          resetPairForm(); 
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPair ? 'Edit Trading Pair' : 'Add New Trading Pair'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePairSubmit} className="space-y-4">
            <div>
              <Label htmlFor="base_asset">Base Asset *</Label>
              <Select
                value={pairFormData.base_asset_id}
                onValueChange={(value) => setPairFormData({ ...pairFormData, base_asset_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select base asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.filter(a => a.trading_enabled).map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      <div className="flex items-center gap-2">
                        <CryptoLogo 
                          symbol={asset.symbol}
                          logoFilePath={asset.logo_file_path}
                          fallbackUrl={asset.logo_url}
                          size={20}
                        />
                        {asset.symbol} - {asset.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quote_asset">Quote Asset *</Label>
              <Select
                value={pairFormData.quote_asset_id}
                onValueChange={(value) => setPairFormData({ ...pairFormData, quote_asset_id: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select quote asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.filter(a => a.trading_enabled).map(asset => (
                    <SelectItem key={asset.id} value={asset.id}>
                      <div className="flex items-center gap-2">
                        <CryptoLogo 
                          symbol={asset.symbol}
                          logoFilePath={asset.logo_file_path}
                          fallbackUrl={asset.logo_url}
                          size={20}
                        />
                        {asset.symbol} - {asset.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="min_notional">Min Notional *</Label>
              <Input
                id="min_notional"
                type="number"
                step="0.01"
                value={pairFormData.min_notional}
                onChange={(e) => setPairFormData({ ...pairFormData, min_notional: parseFloat(e.target.value) || 0 })}
                placeholder="10"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={pairFormData.is_active}
                onCheckedChange={(checked) => setPairFormData({ ...pairFormData, is_active: checked })}
              />
              <Label>Active</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPairDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingPair ? 'Update Pair' : 'Create Pair'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <DetailSheet
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        title={
          'symbol' in (selectedRecord || {})
            ? `${(selectedRecord as Asset)?.symbol} - ${(selectedRecord as Asset)?.name}`
            : `Trading Pair Details`
        }
      >
        {selectedRecord && 'symbol' in selectedRecord && (
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
        {selectedRecord && !('symbol' in selectedRecord) && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Pair Details</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedRecord).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
