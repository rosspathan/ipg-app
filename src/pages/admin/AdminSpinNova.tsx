import * as React from "react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { FilterChips, FilterGroup } from "@/components/admin/nova/FilterChips";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { AuditTrailViewer } from "@/components/admin/nova/AuditTrailViewer";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, TrendingUp, DollarSign, Plus, Edit, Trash2, Settings, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

interface SpinConfig {
  id: string;
  is_enabled: boolean;
  min_bet_bsk: number;
  max_bet_bsk: number;
  min_bet_inr?: number;  // Legacy field
  max_bet_inr?: number;  // Legacy field
  post_free_fee_bsk: number;
  winning_fee_percent: number;
  free_spins_count: number;
  daily_spin_cap_per_user: number | null;
  lifetime_spin_cap_per_user: number | null;
}

interface SpinSegment {
  id: string;
  config_id: string | null;
  label: string;
  weight: number;
  multiplier: number;
  color_hex: string;
  is_active: boolean;
  position_order: number;
}

export default function AdminSpinNova() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [searchValue, setSearchValue] = useState("");
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<SpinSegment | null>(null);

  // Fetch spin wheel config
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['spin-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ismart_spin_config')
        .select('*')
        .eq('is_enabled', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Fetch segments
  const { data: segments = [], isLoading: segmentsLoading } = useQuery({
    queryKey: ['spin-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ismart_spin_segments')
        .select('*')
        .order('weight', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch spin history
  const { data: spinData = [] } = useQuery({
    queryKey: ['spin-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ismart_spins')
        .select('*, profiles(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data.map((spin: any) => ({
        id: spin.id,
        user: spin.profiles?.email || 'Unknown',
        result: `${spin.result_bsk || 0} BSK`,
        cost: `${spin.bet_bsk || spin.bet_inr || 0} BSK`,
        status: spin.result_bsk > 0 ? 'Won' : 'Lost',
        timestamp: new Date(spin.created_at).toLocaleString(),
        txHash: spin.nonce?.toString() || 'N/A'
      }));
    }
  });

  const [configForm, setConfigForm] = useState({
    min_bet_bsk: "",
    max_bet_bsk: "",
    post_free_fee_bsk: "",
    winning_fee_percent: "",
    free_spins_count: "",
    daily_spin_cap_per_user: ""
  });

  const [segmentForm, setSegmentForm] = useState({
    label: "",
    weight: "",
    multiplier: "",
    color_hex: "#10b981",
    is_active: true
  });

  useEffect(() => {
    if (config) {
      const configData = config as any; // Cast to handle dynamic fields
      setConfigForm({
        min_bet_bsk: (configData.min_bet_bsk || configData.min_bet_inr || 10).toString(),
        max_bet_bsk: (configData.max_bet_bsk || configData.max_bet_inr || 1000).toString(),
        post_free_fee_bsk: (configData.post_free_fee_bsk || 10).toString(),
        winning_fee_percent: (configData.winning_fee_percent || 5).toString(),
        free_spins_count: (configData.free_spins_count || 5).toString(),
        daily_spin_cap_per_user: (configData.daily_spin_cap_per_user || 10).toString()
      });
    }
  }, [config]);

  useEffect(() => {
    if (editingSegment) {
      setSegmentForm({
        label: editingSegment.label,
        weight: editingSegment.weight.toString(),
        multiplier: editingSegment.multiplier.toString(),
        color_hex: editingSegment.color_hex,
        is_active: editingSegment.is_active
      });
    }
  }, [editingSegment]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from('ismart_spin_config')
        .update({
          min_bet_bsk: parseFloat(data.min_bet_bsk),
          max_bet_bsk: parseFloat(data.max_bet_bsk),
          min_bet_inr: parseFloat(data.min_bet_bsk),  // Keep for backward compatibility
          max_bet_inr: parseFloat(data.max_bet_bsk),  // Keep for backward compatibility
          post_free_fee_bsk: parseFloat(data.post_free_fee_bsk),
          winning_fee_percent: parseFloat(data.winning_fee_percent),
          free_spins_count: parseInt(data.free_spins_count),
          daily_spin_cap_per_user: data.daily_spin_cap_per_user ? parseInt(data.daily_spin_cap_per_user) : null
        })
        .eq('id', config?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-config'] });
      toast({ title: "Configuration updated successfully" });
      setConfigDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const saveSegmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const segmentData = {
        config_id: config?.id,
        label: data.label,
        weight: parseInt(data.weight),
        multiplier: parseFloat(data.multiplier),
        color_hex: data.color_hex,
        is_active: data.is_active
      };

      if (editingSegment) {
        const { error } = await supabase
          .from('ismart_spin_segments')
          .update(segmentData)
          .eq('id', editingSegment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ismart_spin_segments')
          .insert([segmentData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-segments'] });
      toast({ title: `Segment ${editingSegment ? 'updated' : 'created'} successfully` });
      setSegmentDialogOpen(false);
      setEditingSegment(null);
      resetSegmentForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteSegmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ismart_spin_segments')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-segments'] });
      toast({ title: "Segment deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleUpdateConfig = () => {
    updateConfigMutation.mutate(configForm);
  };

  const handleSaveSegment = () => {
    saveSegmentMutation.mutate(segmentForm);
  };

  const handleDeleteSegment = (id: string) => {
    if (confirm("Are you sure you want to delete this segment?")) {
      deleteSegmentMutation.mutate(id);
    }
  };

  const resetSegmentForm = () => {
    setSegmentForm({
      label: "",
      weight: "",
      multiplier: "",
      color_hex: "#10b981",
      is_active: true
    });
  };

  const columns = [
    { key: "user", label: "User" },
    { key: "result", label: "Result" },
    { key: "cost", label: "Cost" },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant={row.status === "Won" ? "default" : "outline"}
          className={cn(
            row.status === "Won"
              ? "bg-success/10 text-success border-success/20"
              : "bg-muted/10 text-muted-foreground border-muted/20"
          )}
        >
          {row.status}
        </Badge>
      ),
    },
    { key: "timestamp", label: "Time" },
  ];

  const filterGroups: FilterGroup[] = [
    {
      id: "status",
      label: "Status",
      options: [
        { id: "won", label: "Won", value: "Won" },
        { id: "lost", label: "Lost", value: "Lost" },
      ],
    },
  ];

  const mockAuditEntries = [
    {
      id: "1",
      timestamp: "2025-01-15 10:23",
      operator: "System",
      action: "Spin Executed",
      changes: [{ field: "result", before: null, after: "100 BSK" }],
    },
  ];

  return (
    <div data-testid="page-admin-spin" className="space-y-4 pb-6">
      {/* Program KPIs */}
      <CardLane title="Spin Wheel Metrics">
        <KPIStat
          label="Total Spins"
          value={spinData.length.toString()}
          icon={<RefreshCw className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Win Rate"
          value={`${((spinData.filter(s => s.status === 'Won').length / spinData.length) * 100 || 0).toFixed(1)}%`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <KPIStat
          label="Active Segments"
          value={segments.filter(s => s.is_active).length.toString()}
          icon={<Palette className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Min-Max Bet"
          value={`₹${config?.min_bet_inr || 0}-₹${config?.max_bet_inr || 0}`}
          icon={<DollarSign className="w-4 h-4" />}
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <Tabs defaultValue="history" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-heading font-bold text-foreground">
              Spin Wheel Management
            </h1>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfigDialogOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>

          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">Spin History</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">

            <FilterChips
              groups={filterGroups}
              activeFilters={activeFilters}
              onFiltersChange={setActiveFilters}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
            />

            <DataGridAdaptive
              data={spinData}
              columns={columns}
              keyExtractor={(item) => item.id}
              renderCard={(item, selected) => (
                <RecordCard
                  id={item.id}
                  title={item.result}
                  subtitle={item.user}
                  fields={[
                    { label: "Cost", value: item.cost },
                    { label: "Time", value: item.timestamp },
                  ]}
                  status={{
                    label: item.status,
                    variant: item.status === "Won" ? "success" : "default",
                  }}
                  onClick={() => setSelectedRecord(item)}
                  selected={selected}
                />
              )}
              onRowClick={(row) => setSelectedRecord(row)}
              selectable
            />
          </TabsContent>

          <TabsContent value="segments" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Manage spin wheel segments and their probabilities
              </p>
              <Button
                size="sm"
                onClick={() => {
                  setEditingSegment(null);
                  resetSegmentForm();
                  setSegmentDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Segment
              </Button>
            </div>

            <div className="grid gap-4">
              {segments.map((segment) => (
                <Card key={segment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: segment.color_hex }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{segment.label}</h3>
                            <Badge variant={segment.is_active ? "default" : "secondary"}>
                              {segment.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <p>Weight: {segment.weight} | Multiplier: {segment.multiplier}x</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingSegment(segment);
                            setSegmentDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSegment(segment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DetailSheet
        open={!!selectedRecord}
        onOpenChange={(open) => !open && setSelectedRecord(null)}
        title={`Spin - ${selectedRecord?.user}`}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Details</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(selectedRecord).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs text-muted-foreground capitalize">{key}</p>
                    <p className="text-sm text-foreground">{String(value)}</p>
                  </div>
                ))}
              </div>
            </div>
            <AuditTrailViewer entries={mockAuditEntries} />
          </div>
        )}
      </DetailSheet>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Spin Wheel Configuration</DialogTitle>
            <DialogDescription>
              Configure betting limits and fees for the spin wheel
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Bet (BSK)</Label>
                <Input
                  type="number"
                  step="1"
                  value={configForm.min_bet_bsk}
                  onChange={(e) => setConfigForm({ ...configForm, min_bet_bsk: e.target.value })}
                  placeholder="10"
                />
              </div>
              <div>
                <Label>Max Bet (BSK)</Label>
                <Input
                  type="number"
                  step="1"
                  value={configForm.max_bet_bsk}
                  onChange={(e) => setConfigForm({ ...configForm, max_bet_bsk: e.target.value })}
                  placeholder="1000"
                />
              </div>
            </div>
            <div>
              <Label>Play Fee (BSK)</Label>
              <Input
                type="number"
                step="1"
                value={configForm.post_free_fee_bsk}
                onChange={(e) => setConfigForm({ ...configForm, post_free_fee_bsk: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                BSK fee charged per spin after daily free spins are exhausted
              </p>
            </div>
            <div>
              <Label>Winning Fee (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={configForm.winning_fee_percent}
                onChange={(e) => setConfigForm({ ...configForm, winning_fee_percent: e.target.value })}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentage fee deducted from winning amount
              </p>
            </div>
            <div>
              <Label>Free Spins Per Day</Label>
              <Input
                type="number"
                value={configForm.free_spins_count}
                onChange={(e) => setConfigForm({ ...configForm, free_spins_count: e.target.value })}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of free spins each user gets daily
              </p>
            </div>
            <div>
              <Label>Daily Spin Cap Per User</Label>
              <Input
                type="number"
                value={configForm.daily_spin_cap_per_user}
                onChange={(e) => setConfigForm({ ...configForm, daily_spin_cap_per_user: e.target.value })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum total spins (free + paid) per user per day
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateConfig} disabled={updateConfigMutation.isPending}>
                {updateConfigMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Segment Dialog */}
      <Dialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSegment ? "Edit Segment" : "Add New Segment"}</DialogTitle>
            <DialogDescription>
              Configure the segment label, probability weight, and payout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Label</Label>
              <Input
                value={segmentForm.label}
                onChange={(e) => setSegmentForm({ ...segmentForm, label: e.target.value })}
                placeholder="WIN 100 BSK"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Weight</Label>
                <Input
                  type="number"
                  value={segmentForm.weight}
                  onChange={(e) => setSegmentForm({ ...segmentForm, weight: e.target.value })}
                  placeholder="25"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher = more likely
                </p>
              </div>
              <div>
                <Label>Color</Label>
                <Input
                  type="color"
                  value={segmentForm.color_hex}
                  onChange={(e) => setSegmentForm({ ...segmentForm, color_hex: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Multiplier</Label>
              <Input
                type="number"
                step="0.01"
                value={segmentForm.multiplier}
                onChange={(e) => setSegmentForm({ ...segmentForm, multiplier: e.target.value })}
                placeholder="1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Win multiplier (e.g., 2.0 = 2x the bet amount)
              </p>
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={segmentForm.is_active}
                onCheckedChange={(checked) => setSegmentForm({ ...segmentForm, is_active: checked })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setSegmentDialogOpen(false);
                setEditingSegment(null);
                resetSegmentForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSaveSegment} disabled={saveSegmentMutation.isPending}>
                {saveSegmentMutation.isPending ? "Saving..." : "Save Segment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
