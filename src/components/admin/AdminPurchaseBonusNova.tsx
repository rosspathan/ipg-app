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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, TrendingUp, Users, Coins, Plus, Edit, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PurchaseBonusRule {
  id: string;
  name: string;
  purchase_asset_id: string | null;
  purchase_asset_symbol: string;
  bonus_asset_symbol: string;
  min_purchase_amount: number;
  max_purchase_amount: number | null;
  bonus_ratio: number;
  vesting_days: number;
  vesting_enabled: boolean;
  rounding_mode: string;
  max_bonus_per_user: number | null;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean;
  description: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

interface Asset {
  id: string;
  symbol: string;
  name: string;
}

export default function AdminPurchaseBonusNova() {
  const [rules, setRules] = useState<PurchaseBonusRule[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<PurchaseBonusRule | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PurchaseBonusRule | null>(null);
  const [formChanges, setFormChanges] = useState<Record<string, boolean>>({});
  const [calcAmount, setCalcAmount] = useState("");
  const [calcResult, setCalcResult] = useState<any>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    purchase_asset_id: "any",
    purchase_asset_symbol: "",
    bonus_asset_symbol: "BSK",
    min_purchase_amount: "",
    max_purchase_amount: "",
    bonus_ratio: "",
    vesting_days: "100",
    vesting_enabled: true,
    rounding_mode: "floor",
    max_bonus_per_user: "",
    start_at: "",
    end_at: "",
    is_active: true,
    description: "",
    terms: "",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesResponse, assetsResponse] = await Promise.all([
        supabase.from("purchase_bonus_rules").select("*").order("created_at", { ascending: false }),
        supabase.from("assets").select("id, symbol, name").eq("is_active", true),
      ]);

      if (rulesResponse.error) throw rulesResponse.error;
      if (assetsResponse.error) throw assetsResponse.error;

      setRules(rulesResponse.data || []);
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
      purchase_asset_id: "any",
      purchase_asset_symbol: "",
      bonus_asset_symbol: "BSK",
      min_purchase_amount: "",
      max_purchase_amount: "",
      bonus_ratio: "",
      vesting_days: "100",
      vesting_enabled: true,
      rounding_mode: "floor",
      max_bonus_per_user: "",
      start_at: "",
      end_at: "",
      is_active: true,
      description: "",
      terms: "",
    });
    setEditingRule(null);
    setFormChanges({});
  };

  const handleEdit = (rule: PurchaseBonusRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      purchase_asset_id: rule.purchase_asset_id || "any",
      purchase_asset_symbol: rule.purchase_asset_symbol,
      bonus_asset_symbol: rule.bonus_asset_symbol,
      min_purchase_amount: rule.min_purchase_amount.toString(),
      max_purchase_amount: rule.max_purchase_amount?.toString() || "",
      bonus_ratio: rule.bonus_ratio.toString(),
      vesting_days: rule.vesting_days.toString(),
      vesting_enabled: rule.vesting_enabled,
      rounding_mode: rule.rounding_mode,
      max_bonus_per_user: rule.max_bonus_per_user?.toString() || "",
      start_at: rule.start_at || "",
      end_at: rule.end_at || "",
      is_active: rule.is_active,
      description: rule.description || "",
      terms: rule.terms || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const ruleData = {
        name: formData.name,
        purchase_asset_id: formData.purchase_asset_id === "any" ? null : formData.purchase_asset_id,
        purchase_asset_symbol: formData.purchase_asset_symbol,
        bonus_asset_symbol: formData.bonus_asset_symbol,
        min_purchase_amount: parseFloat(formData.min_purchase_amount),
        max_purchase_amount: formData.max_purchase_amount ? parseFloat(formData.max_purchase_amount) : null,
        bonus_ratio: parseFloat(formData.bonus_ratio),
        vesting_days: parseInt(formData.vesting_days),
        vesting_enabled: formData.vesting_enabled,
        rounding_mode: formData.rounding_mode,
        max_bonus_per_user: formData.max_bonus_per_user ? parseFloat(formData.max_bonus_per_user) : null,
        start_at: formData.start_at || null,
        end_at: formData.end_at || null,
        is_active: formData.is_active,
        description: formData.description || null,
        terms: formData.terms || null,
      };

      let response;
      if (editingRule) {
        response = await supabase
          .from("purchase_bonus_rules")
          .update(ruleData)
          .eq("id", editingRule.id);
      } else {
        response = await supabase.from("purchase_bonus_rules").insert([ruleData]);
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Bonus rule ${editingRule ? "updated" : "created"} successfully`,
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

  const calculateBonusPreview = () => {
    const amount = parseFloat(calcAmount);
    if (!amount || !selectedRecord) return;

    const rule = selectedRecord;
    if (amount < rule.min_purchase_amount) {
      setCalcResult({
        eligible: false,
        reason: `Minimum purchase is ${rule.min_purchase_amount} ${rule.purchase_asset_symbol}`,
      });
      return;
    }

    if (rule.max_purchase_amount && amount > rule.max_purchase_amount) {
      setCalcResult({
        eligible: false,
        reason: `Maximum purchase is ${rule.max_purchase_amount} ${rule.purchase_asset_symbol}`,
      });
      return;
    }

    const rawBonus = amount * rule.bonus_ratio;
    let bonus = rawBonus;

    switch (rule.rounding_mode) {
      case "floor":
        bonus = Math.floor(rawBonus);
        break;
      case "ceil":
        bonus = Math.ceil(rawBonus);
        break;
      case "round":
        bonus = Math.round(rawBonus);
        break;
    }

    if (rule.max_bonus_per_user && bonus > rule.max_bonus_per_user) {
      bonus = rule.max_bonus_per_user;
    }

    setCalcResult({
      eligible: true,
      bonus,
      dailyRelease: rule.vesting_enabled && rule.vesting_days > 0 ? (bonus / rule.vesting_days).toFixed(6) : bonus,
      vestingDays: rule.vesting_days,
      vestingEnabled: rule.vesting_enabled,
    });
  };

  const columns = [
    { key: "name", label: "Rule Name" },
    {
      key: "purchase_symbol",
      label: "Purchase → Bonus",
      render: (row: PurchaseBonusRule) => (
        <div className="font-medium">
          {row.purchase_asset_symbol} → {row.bonus_asset_symbol}
        </div>
      ),
    },
    {
      key: "bonus_ratio",
      label: "Ratio",
      render: (row: PurchaseBonusRule) => (
        <span className="font-mono text-sm">
          {row.bonus_ratio} {row.bonus_asset_symbol} per 1 {row.purchase_asset_symbol}
        </span>
      ),
    },
    {
      key: "vesting",
      label: "Vesting",
      render: (row: PurchaseBonusRule) => (
        <span>
          {row.vesting_enabled ? `${row.vesting_days} days` : "Instant"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: PurchaseBonusRule) => (
        <Badge
          variant={row.is_active ? "default" : "outline"}
          className={cn(
            row.is_active
              ? "bg-success/10 text-success border-success/20"
              : "bg-muted text-muted-foreground"
          )}
        >
          {row.is_active ? "Active" : "Inactive"}
        </Badge>
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
      id: "vesting",
      label: "Vesting",
      options: [
        { id: "vesting", label: "With Vesting", value: "vesting" },
        { id: "instant", label: "Instant", value: "instant" },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading bonus rules...</p>
      </div>
    );
  }

  return (
    <div data-testid="page-admin-purchase-bonus" className="space-y-4 pb-6">
      {/* Metrics */}
      <CardLane title="Bonus Metrics">
        <KPIStat
          label="Active Rules"
          value={rules.filter((r) => r.is_active).length.toString()}
          icon={<Gift className="w-4 h-4" />}
          variant="primary"
        />
        <KPIStat
          label="Total Rules"
          value={rules.length.toString()}
          icon={<Coins className="w-4 h-4" />}
        />
        <KPIStat
          label="Vesting Enabled"
          value={rules.filter((r) => r.vesting_enabled).length.toString()}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPIStat
          label="Instant Bonus"
          value={rules.filter((r) => !r.vesting_enabled).length.toString()}
          icon={<Users className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      <Tabs defaultValue="rules" className="px-4">
        <TabsList>
          <TabsTrigger value="rules">Bonus Rules</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-heading font-bold text-foreground">Purchase Bonus Rules</h1>
            <Button
              size="sm"
              onClick={() => {
                resetForm();
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
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
            data={rules}
            columns={columns}
            keyExtractor={(item) => item.id}
            renderCard={(item, selected) => (
              <RecordCard
                id={item.id}
                title={item.name}
                subtitle={`${item.purchase_asset_symbol} → ${item.bonus_asset_symbol}`}
                fields={[
                  {
                    label: "Ratio",
                    value: `${item.bonus_ratio} ${item.bonus_asset_symbol} per 1 ${item.purchase_asset_symbol}`,
                  },
                  {
                    label: "Vesting",
                    value: item.vesting_enabled ? `${item.vesting_days} days` : "Instant",
                  },
                  { label: "Min Purchase", value: item.min_purchase_amount.toString() },
                ]}
                status={{
                  label: item.is_active ? "Active" : "Inactive",
                  variant: item.is_active ? "success" : "default",
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
        </TabsContent>

        <TabsContent value="calculator" className="space-y-4 mt-4">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Bonus Calculator</h2>
            <div className="space-y-2">
              <Label>Select Rule</Label>
              <div className="grid gap-2">
                {rules
                  .filter((r) => r.is_active)
                  .map((rule) => (
                    <Button
                      key={rule.id}
                      variant={selectedRecord?.id === rule.id ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => {
                        setSelectedRecord(rule);
                        setCalcResult(null);
                      }}
                    >
                      {rule.name}
                    </Button>
                  ))}
              </div>
            </div>

            {selectedRecord && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Purchase Amount ({selectedRecord.purchase_asset_symbol})</Label>
                  <Input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(e.target.value)}
                    placeholder={`Enter amount in ${selectedRecord.purchase_asset_symbol}`}
                  />
                </div>
                <Button onClick={calculateBonusPreview} className="w-full">
                  <Calculator className="w-4 h-4 mr-2" />
                  Calculate Bonus
                </Button>

                {calcResult && (
                  <div className="p-4 border rounded-lg space-y-2">
                    {calcResult.eligible ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Bonus</span>
                          <span className="text-lg font-bold text-success">
                            {calcResult.bonus} {selectedRecord.bonus_asset_symbol}
                          </span>
                        </div>
                        {calcResult.vestingEnabled && calcResult.vestingDays > 0 && (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Daily Release</span>
                              <span className="font-mono text-sm">
                                {calcResult.dailyRelease} {selectedRecord.bonus_asset_symbol}/day
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Vesting Period</span>
                              <span className="text-sm">{calcResult.vestingDays} days</span>
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-destructive">{calcResult.reason}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Edit Bonus Rule" : "Create New Bonus Rule"}
            </DialogTitle>
          </DialogHeader>

          <FormKit
            layout="2col"
            changes={formChanges}
            fields={[
              {
                id: "name",
                type: "text",
                label: "Rule Name",
                value: formData.name,
                onChange: (v) => setFormData({ ...formData, name: v }),
                required: true,
                span: 2,
                description: "e.g., IPG 1:1 Bonus (100 days vesting)",
              },
              {
                id: "purchase_asset_symbol",
                type: "text",
                label: "Purchase Asset Symbol",
                value: formData.purchase_asset_symbol,
                onChange: (v) => setFormData({ ...formData, purchase_asset_symbol: v }),
                required: true,
                description: "Symbol of coin users must buy (e.g., IPG, USDT, BTC)",
              },
              {
                id: "bonus_asset_symbol",
                type: "text",
                label: "Bonus Asset Symbol",
                value: formData.bonus_asset_symbol,
                onChange: (v) => setFormData({ ...formData, bonus_asset_symbol: v }),
                required: true,
                description: "Symbol of bonus coin (usually BSK)",
              },
              {
                id: "min_purchase_amount",
                type: "number",
                label: "Min Purchase Amount",
                value: formData.min_purchase_amount,
                onChange: (v) => setFormData({ ...formData, min_purchase_amount: v }),
                required: true,
                description: "Minimum amount to qualify for bonus",
              },
              {
                id: "max_purchase_amount",
                type: "number",
                label: "Max Purchase Amount",
                value: formData.max_purchase_amount,
                onChange: (v) => setFormData({ ...formData, max_purchase_amount: v }),
                description: "Maximum amount (leave empty for unlimited)",
              },
              {
                id: "bonus_ratio",
                type: "number",
                label: "Bonus Ratio",
                value: formData.bonus_ratio,
                onChange: (v) => setFormData({ ...formData, bonus_ratio: v }),
                required: true,
                description: "Bonus amount per 1 unit purchased (e.g., 1 means 1:1)",
              },
              {
                id: "vesting_enabled",
                type: "switch",
                label: "Enable Vesting",
                value: formData.vesting_enabled,
                onChange: (v) => setFormData({ ...formData, vesting_enabled: v }),
                description: "Distribute bonus over multiple days or give instantly",
              },
              {
                id: "vesting_days",
                type: "number",
                label: "Vesting Days",
                value: formData.vesting_days,
                onChange: (v) => setFormData({ ...formData, vesting_days: v }),
                disabled: !formData.vesting_enabled,
                description: "Number of days to distribute bonus",
              },
              {
                id: "rounding_mode",
                type: "select",
                label: "Rounding Mode",
                value: formData.rounding_mode,
                onChange: (v) => setFormData({ ...formData, rounding_mode: v }),
                options: [
                  { value: "floor", label: "Floor (Round Down)" },
                  { value: "round", label: "Round (Nearest)" },
                  { value: "ceil", label: "Ceil (Round Up)" },
                ],
              },
              {
                id: "max_bonus_per_user",
                type: "number",
                label: "Max Bonus Per User",
                value: formData.max_bonus_per_user,
                onChange: (v) => setFormData({ ...formData, max_bonus_per_user: v }),
                description: "Maximum total bonus per user (optional)",
              },
              {
                id: "is_active",
                type: "switch",
                label: "Active",
                value: formData.is_active,
                onChange: (v) => setFormData({ ...formData, is_active: v }),
                description: "Make this rule available to users",
              },
              {
                id: "description",
                type: "textarea",
                label: "Description",
                value: formData.description,
                onChange: (v) => setFormData({ ...formData, description: v }),
                span: 2,
                description: "Describe this bonus program",
              },
              {
                id: "terms",
                type: "textarea",
                label: "Terms & Conditions",
                value: formData.terms,
                onChange: (v) => setFormData({ ...formData, terms: v }),
                span: 2,
                description: "Legal terms for this bonus",
              },
            ]}
          />

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{editingRule ? "Update" : "Create"} Rule</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DetailSheet
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        title={selectedRecord?.name || "Rule Details"}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={selectedRecord.is_active ? "default" : "outline"}>
                  {selectedRecord.is_active ? "Active" : "Inactive"}
                </Badge>
                <Button size="sm" onClick={() => handleEdit(selectedRecord)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Rule
                </Button>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="text-sm font-medium mb-1">Bonus Structure</div>
                <div className="text-lg font-bold">
                  {selectedRecord.purchase_asset_symbol} → {selectedRecord.bonus_asset_symbol}
                </div>
                <div className="text-sm text-muted-foreground">
                  Get {selectedRecord.bonus_ratio} {selectedRecord.bonus_asset_symbol} for every 1{" "}
                  {selectedRecord.purchase_asset_symbol} purchased
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Min Purchase</p>
                  <p className="text-sm font-medium">
                    {selectedRecord.min_purchase_amount} {selectedRecord.purchase_asset_symbol}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Purchase</p>
                  <p className="text-sm font-medium">
                    {selectedRecord.max_purchase_amount || "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vesting Period</p>
                  <p className="text-sm font-medium">
                    {selectedRecord.vesting_enabled
                      ? `${selectedRecord.vesting_days} days`
                      : "Instant"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rounding Mode</p>
                  <p className="text-sm font-medium capitalize">{selectedRecord.rounding_mode}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Per User</p>
                  <p className="text-sm font-medium">
                    {selectedRecord.max_bonus_per_user || "Unlimited"}
                  </p>
                </div>
              </div>

              {selectedRecord.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{selectedRecord.description}</p>
                </div>
              )}

              {selectedRecord.terms && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Terms & Conditions</p>
                  <p className="text-sm text-muted-foreground">{selectedRecord.terms}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
