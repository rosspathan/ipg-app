import * as React from "react";
import { useState, useEffect } from "react";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { FilterChips, FilterGroup } from "@/components/admin/nova/FilterChips";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { FormKit } from "@/components/admin/nova/FormKit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Coins, TrendingUp, Users, DollarSign, Plus, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StakingPool {
  id: string;
  name: string;
  asset_id: string | null;
  staking_type: string;
  apy: number;
  lock_period_days: number;
  has_lock_period: boolean;
  min_stake_amount: number;
  max_stake_amount: number | null;
  capacity: number | null;
  current_staked: number;
  early_exit_penalty: number;
  platform_fee: number;
  reward_distribution: string;
  compound_rewards: boolean;
  active: boolean;
  description: string | null;
  terms_conditions: string | null;
  created_at: string;
  updated_at: string;
}

interface Asset {
  id: string;
  symbol: string;
  name: string;
}

export default function AdminStakingNova() {
  const [pools, setPools] = useState<StakingPool[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<StakingPool | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<StakingPool | null>(null);
  const [formChanges, setFormChanges] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    asset_id: "any",
    staking_type: "crypto",
    apy: "",
    lock_period_days: "",
    has_lock_period: true,
    min_stake_amount: "",
    max_stake_amount: "",
    capacity: "",
    early_exit_penalty: "",
    platform_fee: "",
    reward_distribution: "daily",
    compound_rewards: false,
    active: true,
    description: "",
    terms_conditions: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [poolsResponse, assetsResponse] = await Promise.all([
        supabase.from("staking_pools").select("*").order("created_at", { ascending: false }),
        supabase.from("assets").select("id, symbol, name").eq("is_active", true),
      ]);

      if (poolsResponse.error) throw poolsResponse.error;
      if (assetsResponse.error) throw assetsResponse.error;

      setPools(poolsResponse.data || []);
      setAssets(assetsResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      asset_id: "any",
      staking_type: "crypto",
      apy: "",
      lock_period_days: "",
      has_lock_period: true,
      min_stake_amount: "",
      max_stake_amount: "",
      capacity: "",
      early_exit_penalty: "",
      platform_fee: "",
      reward_distribution: "daily",
      compound_rewards: false,
      active: true,
      description: "",
      terms_conditions: "",
    });
    setEditingPool(null);
    setFormChanges({});
  };

  const handleEdit = (pool: StakingPool) => {
    setEditingPool(pool);
    setFormData({
      name: pool.name,
      asset_id: pool.asset_id || "any",
      staking_type: pool.staking_type,
      apy: pool.apy.toString(),
      lock_period_days: pool.lock_period_days.toString(),
      has_lock_period: pool.has_lock_period,
      min_stake_amount: pool.min_stake_amount.toString(),
      max_stake_amount: pool.max_stake_amount?.toString() || "",
      capacity: pool.capacity?.toString() || "",
      early_exit_penalty: pool.early_exit_penalty.toString(),
      platform_fee: pool.platform_fee.toString(),
      reward_distribution: pool.reward_distribution,
      compound_rewards: pool.compound_rewards,
      active: pool.active,
      description: pool.description || "",
      terms_conditions: pool.terms_conditions || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const poolData = {
        name: formData.name,
        asset_id: formData.asset_id === "any" ? null : formData.asset_id,
        staking_type: formData.staking_type,
        apy: parseFloat(formData.apy),
        lock_period_days: parseInt(formData.lock_period_days),
        has_lock_period: formData.has_lock_period,
        min_stake_amount: parseFloat(formData.min_stake_amount),
        max_stake_amount: formData.max_stake_amount ? parseFloat(formData.max_stake_amount) : null,
        capacity: formData.capacity ? parseFloat(formData.capacity) : null,
        early_exit_penalty: parseFloat(formData.early_exit_penalty),
        platform_fee: parseFloat(formData.platform_fee),
        reward_distribution: formData.reward_distribution,
        compound_rewards: formData.compound_rewards,
        active: formData.active,
        description: formData.description || null,
        terms_conditions: formData.terms_conditions || null,
      };

      let response;
      if (editingPool) {
        response = await supabase
          .from("staking_pools")
          .update(poolData)
          .eq("id", editingPool.id);
      } else {
        response = await supabase.from("staking_pools").insert([poolData]);
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Staking pool ${editingPool ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getAssetSymbol = (assetId: string | null) => {
    if (!assetId) return "Any";
    const asset = assets.find((a) => a.id === assetId);
    return asset?.symbol || "Unknown";
  };

  const columns = [
    { key: "name", label: "Pool Name" },
    {
      key: "staking_type",
      label: "Type",
      render: (row: StakingPool) => (
        <Badge variant="outline" className="font-mono">
          {row.staking_type.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "apy",
      label: "APY",
      render: (row: StakingPool) => (
        <span className="font-medium text-success">{row.apy}%</span>
      ),
    },
    {
      key: "lock_period",
      label: "Lock Period",
      render: (row: StakingPool) => (
        <span>
          {row.has_lock_period ? `${row.lock_period_days} days` : "Flexible"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: StakingPool) => (
        <Badge
          variant={row.active ? "default" : "outline"}
          className={cn(
            row.active
              ? "bg-success/10 text-success border-success/20"
              : "bg-muted text-muted-foreground"
          )}
        >
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "min_stake",
      label: "Min Stake",
      render: (row: StakingPool) => (
        <span className="font-mono text-sm">{row.min_stake_amount}</span>
      ),
    },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { id: "active", label: "Active", value: "active" },
        { id: "inactive", label: "Inactive", value: "inactive" },
      ],
    },
    {
      id: "staking_type",
      label: "Type",
      options: [
        { id: "crypto", label: "Crypto", value: "crypto" },
        { id: "bsk", label: "BSK", value: "bsk" },
        { id: "fiat", label: "Fiat", value: "fiat" },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading staking pools...</p>
      </div>
    );
  }

  return (
    <div data-testid="page-admin-staking" className="space-y-4 pb-6">
      {/* Program KPIs */}
      <CardLane title="Staking Metrics">
        <KPIStat
          label="Total TVL"
          value="$2.4M"
          delta={{ value: 12.5, trend: "up" }}
          sparkline={[1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4]}
          icon={<Coins className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Active Stakes"
          value="1,847"
          delta={{ value: 8.2, trend: "up" }}
          icon={<Users className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Avg APY"
          value="9.2%"
          delta={{ value: 0.5, trend: "up" }}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPIStat
          label="Total Rewards"
          value="$128k"
          delta={{ value: 15.3, trend: "up" }}
          icon={<DollarSign className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold text-foreground">
            Staking Pools
          </h1>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Pool
          </Button>
        </div>

        <FilterChips
          groups={filterGroups}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />

        <DataGridAdaptive
          data={pools}
          columns={columns}
          keyExtractor={(item) => item.id}
          renderCard={(item, selected) => (
            <RecordCard
              id={item.id}
              title={item.name}
              subtitle={`${item.staking_type.toUpperCase()} • ${getAssetSymbol(item.asset_id)}`}
              fields={[
                { label: "APY", value: `${item.apy}%` },
                {
                  label: "Lock Period",
                  value: item.has_lock_period ? `${item.lock_period_days} days` : "Flexible",
                },
                { label: "Min Stake", value: item.min_stake_amount.toString() },
              ]}
              status={{
                label: item.active ? "Active" : "Inactive",
                variant: item.active ? "success" : "default",
              }}
              onClick={() => setSelectedRecord(item)}
              selected={selected}
              actions={[
                {
                  label: "Edit",
                  icon: Edit,
                  onClick: () => handleEdit(item),
                },
              ]}
            />
          )}
          onRowClick={(row) => setSelectedRecord(row)}
          selectable
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPool ? "Edit Staking Pool" : "Create New Staking Pool"}
            </DialogTitle>
          </DialogHeader>

          <FormKit
            layout="2col"
            changes={formChanges}
            fields={[
              {
                id: "name",
                type: "text",
                label: "Pool Name",
                value: formData.name,
                onChange: (v) => setFormData({ ...formData, name: v }),
                required: true,
                span: 2,
              },
              {
                id: "staking_type",
                type: "select",
                label: "Staking Type",
                value: formData.staking_type,
                onChange: (v) => setFormData({ ...formData, staking_type: v }),
                options: [
                  { value: "crypto", label: "Real Crypto Staking" },
                  { value: "bsk", label: "BSK Token Staking" },
                  { value: "fiat", label: "Fiat/Stablecoin Staking" },
                ],
              },
              {
                id: "asset_id",
                type: "select",
                label: "Asset (Optional)",
                value: formData.asset_id || "any",
                onChange: (v) => setFormData({ ...formData, asset_id: v === "any" ? "" : v }),
                options: [
                  { value: "any", label: "Any Asset" },
                  ...assets.map((a) => ({ value: a.id, label: `${a.symbol} - ${a.name}` })),
                ],
              },
              {
                id: "apy",
                type: "number",
                label: "APY (%)",
                value: formData.apy,
                onChange: (v) => setFormData({ ...formData, apy: v }),
                required: true,
                description: "Annual Percentage Yield",
              },
              {
                id: "has_lock_period",
                type: "switch",
                label: "Has Lock Period",
                value: formData.has_lock_period,
                onChange: (v) => setFormData({ ...formData, has_lock_period: v }),
                description: "Enable fixed lock period or allow flexible withdrawal",
              },
              {
                id: "lock_period_days",
                type: "number",
                label: "Lock Period (Days)",
                value: formData.lock_period_days,
                onChange: (v) => setFormData({ ...formData, lock_period_days: v }),
                disabled: !formData.has_lock_period,
              },
              {
                id: "reward_distribution",
                type: "select",
                label: "Reward Distribution",
                value: formData.reward_distribution,
                onChange: (v) => setFormData({ ...formData, reward_distribution: v }),
                options: [
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                  { value: "monthly", label: "Monthly" },
                  { value: "maturity", label: "At Maturity" },
                ],
              },
              {
                id: "min_stake_amount",
                type: "number",
                label: "Min Stake Amount",
                value: formData.min_stake_amount,
                onChange: (v) => setFormData({ ...formData, min_stake_amount: v }),
                required: true,
              },
              {
                id: "max_stake_amount",
                type: "number",
                label: "Max Stake Amount",
                value: formData.max_stake_amount,
                onChange: (v) => setFormData({ ...formData, max_stake_amount: v }),
                description: "Leave empty for unlimited",
              },
              {
                id: "capacity",
                type: "number",
                label: "Pool Capacity",
                value: formData.capacity,
                onChange: (v) => setFormData({ ...formData, capacity: v }),
                description: "Total pool capacity (optional)",
              },
              {
                id: "early_exit_penalty",
                type: "number",
                label: "Early Exit Penalty (%)",
                value: formData.early_exit_penalty,
                onChange: (v) => setFormData({ ...formData, early_exit_penalty: v }),
                description: "Penalty for early withdrawal",
              },
              {
                id: "platform_fee",
                type: "number",
                label: "Platform Fee (%)",
                value: formData.platform_fee,
                onChange: (v) => setFormData({ ...formData, platform_fee: v }),
                description: "Fee charged on rewards",
              },
              {
                id: "compound_rewards",
                type: "switch",
                label: "Compound Rewards",
                value: formData.compound_rewards,
                onChange: (v) => setFormData({ ...formData, compound_rewards: v }),
                description: "Automatically reinvest rewards",
              },
              {
                id: "active",
                type: "switch",
                label: "Active",
                value: formData.active,
                onChange: (v) => setFormData({ ...formData, active: v }),
                description: "Make this pool available to users",
              },
              {
                id: "description",
                type: "textarea",
                label: "Description",
                value: formData.description,
                onChange: (v) => setFormData({ ...formData, description: v }),
                span: 2,
              },
              {
                id: "terms_conditions",
                type: "textarea",
                label: "Terms & Conditions",
                value: formData.terms_conditions,
                onChange: (v) => setFormData({ ...formData, terms_conditions: v }),
                span: 2,
              },
            ]}
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPool ? "Update" : "Create"} Pool
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        title={selectedRecord?.name || "Pool Details"}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={selectedRecord.active ? "default" : "outline"}>
                  {selectedRecord.active ? "Active" : "Inactive"}
                </Badge>
                <Button size="sm" onClick={() => handleEdit(selectedRecord)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Pool
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Staking Type</p>
                  <p className="text-sm font-medium">{selectedRecord.staking_type.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Asset</p>
                  <p className="text-sm font-medium">{getAssetSymbol(selectedRecord.asset_id)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">APY</p>
                  <p className="text-sm font-medium text-success">{selectedRecord.apy}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lock Period</p>
                  <p className="text-sm font-medium">
                    {selectedRecord.has_lock_period
                      ? `${selectedRecord.lock_period_days} days`
                      : "Flexible"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Min Stake</p>
                  <p className="text-sm font-medium">{selectedRecord.min_stake_amount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Stake</p>
                  <p className="text-sm font-medium">
                    {selectedRecord.max_stake_amount || "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="text-sm font-medium">
                    {selectedRecord.capacity || "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Staked</p>
                  <p className="text-sm font-medium">{selectedRecord.current_staked}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Early Exit Penalty</p>
                  <p className="text-sm font-medium">{selectedRecord.early_exit_penalty}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Platform Fee</p>
                  <p className="text-sm font-medium">{selectedRecord.platform_fee}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reward Distribution</p>
                  <p className="text-sm font-medium capitalize">
                    {selectedRecord.reward_distribution}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Compound Rewards</p>
                  <p className="text-sm font-medium">
                    {selectedRecord.compound_rewards ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {selectedRecord.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedRecord.description}</p>
                </div>
              )}

              {selectedRecord.terms_conditions && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Terms & Conditions</p>
                  <p className="text-sm">{selectedRecord.terms_conditions}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
