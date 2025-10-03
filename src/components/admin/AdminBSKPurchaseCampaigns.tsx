import * as React from "react";
import { useState, useEffect } from "react";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { FormKit } from "@/components/admin/nova/FormKit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Gift, TrendingUp, Percent, Trash2, Plus, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BSKCampaign {
  id: string;
  name: string;
  min_purchase_bsk: number;
  max_purchase_bsk: number;
  bonus_percent: number;
  fee_percent: number;
  fee_fixed: number;
  destination: 'withdrawable' | 'holding';
  status: 'draft' | 'live' | 'paused' | 'ended';
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  description: string | null;
}

export default function AdminBSKPurchaseCampaigns() {
  const [campaigns, setCampaigns] = useState<BSKCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<BSKCampaign | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<BSKCampaign | null>(null);
  const [formChanges, setFormChanges] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    min_purchase_bsk: "1000",
    max_purchase_bsk: "100000",
    bonus_percent: "25",
    fee_percent: "0",
    fee_fixed: "0",
    destination: "holding",
    status: "live",
    start_at: "",
    end_at: "",
    description: "",
  });

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bsk_bonus_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCampaigns((data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        min_purchase_bsk: c.min_purchase_inr, // Using INR fields for BSK amounts
        max_purchase_bsk: c.max_purchase_inr,
        bonus_percent: c.bonus_percent,
        fee_percent: c.fee_percent || 0,
        fee_fixed: c.fee_fixed || 0,
        destination: c.destination,
        status: c.status,
        start_at: c.start_at,
        end_at: c.end_at,
        created_at: c.created_at,
        description: c.description,
      })));
    } catch (error: any) {
      toast({
        title: "Error loading campaigns",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      min_purchase_bsk: "1000",
      max_purchase_bsk: "100000",
      bonus_percent: "25",
      fee_percent: "0",
      fee_fixed: "0",
      destination: "holding",
      status: "live",
      start_at: "",
      end_at: "",
      description: "",
    });
    setEditingCampaign(null);
    setFormChanges({});
  };

  const handleEdit = (campaign: BSKCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      min_purchase_bsk: campaign.min_purchase_bsk.toString(),
      max_purchase_bsk: campaign.max_purchase_bsk.toString(),
      bonus_percent: campaign.bonus_percent.toString(),
      fee_percent: campaign.fee_percent.toString(),
      fee_fixed: campaign.fee_fixed.toString(),
      destination: campaign.destination,
      status: campaign.status,
      start_at: campaign.start_at || "",
      end_at: campaign.end_at || "",
      description: campaign.description || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const campaignData = {
        name: formData.name,
        min_purchase_inr: parseFloat(formData.min_purchase_bsk), // Using INR fields for BSK
        max_purchase_inr: parseFloat(formData.max_purchase_bsk),
        bonus_percent: parseFloat(formData.bonus_percent),
        fee_percent: parseFloat(formData.fee_percent),
        fee_fixed: parseFloat(formData.fee_fixed),
        destination: formData.destination,
        status: formData.status,
        start_at: formData.start_at || null,
        end_at: formData.end_at || null,
        description: formData.description || null,
        eligible_channels: ['swap_ipg_bsk'],
        rate_snapshot_bsk_inr: 1, // 1:1 for BSK purchases
        vesting_enabled: false, // Immediate bonus
        vesting_duration_days: 0,
        per_user_limit: 'unlimited',
        allow_stacking: true,
        cooloff_hours: 0,
      };

      let response;
      if (editingCampaign) {
        response = await supabase
          .from("bsk_bonus_campaigns")
          .update(campaignData as any)
          .eq("id", editingCampaign.id);
      } else {
        response = await supabase
          .from("bsk_bonus_campaigns")
          .insert([campaignData] as any);
      }

      if (response.error) throw response.error;

      toast({
        title: "Success",
        description: `Campaign ${editingCampaign ? "updated" : "created"} successfully`,
      });

      setDialogOpen(false);
      resetForm();
      loadCampaigns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;

    try {
      const { error } = await supabase
        .from("bsk_bonus_campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Campaign deleted successfully",
      });

      loadCampaigns();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateFormField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormChanges((prev) => ({ ...prev, [field]: true }));
  };

  const formFields = [
    {
      id: "name",
      type: "text" as const,
      label: "Campaign Name",
      value: formData.name,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormField("name", e.target.value),
      placeholder: "e.g., Diwali BSK Bonus 25%",
      required: true,
      span: 2 as const,
    },
    {
      id: "min_purchase_bsk",
      type: "number" as const,
      label: "Minimum Purchase (BSK)",
      value: formData.min_purchase_bsk,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormField("min_purchase_bsk", e.target.value),
      placeholder: "1000",
      required: true,
    },
    {
      id: "max_purchase_bsk",
      type: "number" as const,
      label: "Maximum Purchase (BSK)",
      value: formData.max_purchase_bsk,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormField("max_purchase_bsk", e.target.value),
      placeholder: "100000",
      required: true,
    },
    {
      id: "bonus_percent",
      type: "number" as const,
      label: "Bonus Percentage (%)",
      value: formData.bonus_percent,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormField("bonus_percent", e.target.value),
      placeholder: "25",
      required: true,
      description: "Percentage of bonus BSK awarded",
    },
    {
      id: "fee_percent",
      type: "number" as const,
      label: "Fee Percentage (%)",
      value: formData.fee_percent,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormField("fee_percent", e.target.value),
      placeholder: "0",
      description: "e.g., 2 = 2% fee on purchase amount",
    },
    {
      id: "fee_fixed",
      type: "number" as const,
      label: "Fixed Fee (BSK)",
      value: formData.fee_fixed,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormField("fee_fixed", e.target.value),
      placeholder: "0",
      description: "Flat fee added to every purchase",
    },
    {
      id: "destination",
      type: "select" as const,
      label: "Bonus Destination",
      value: formData.destination,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => updateFormField("destination", e.target.value),
      options: [
        { value: "holding", label: "Holding Balance" },
        { value: "withdrawable", label: "Withdrawable Balance" },
      ],
      description: "Where bonus BSK is credited",
    },
    {
      id: "status",
      type: "select" as const,
      label: "Campaign Status",
      value: formData.status,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => updateFormField("status", e.target.value),
      options: [
        { value: "live", label: "Live (Active)" },
        { value: "paused", label: "Paused" },
        { value: "draft", label: "Draft" },
        { value: "ended", label: "Ended" },
      ],
    },
    {
      id: "start_at",
      type: "text" as const,
      label: "Start Date/Time (Optional)",
      value: formData.start_at,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormField("start_at", e.target.value),
      description: "Format: YYYY-MM-DDTHH:MM (leave empty for immediate)",
      placeholder: "2025-10-05T10:00",
    },
    {
      id: "end_at",
      type: "text" as const,
      label: "End Date/Time (Optional)",
      value: formData.end_at,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => updateFormField("end_at", e.target.value),
      description: "Format: YYYY-MM-DDTHH:MM (leave empty for no expiry)",
      placeholder: "2025-12-31T23:59",
    },
    {
      id: "description",
      type: "textarea" as const,
      label: "Campaign Description",
      value: formData.description,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => updateFormField("description", e.target.value),
      placeholder: "Describe the campaign benefits and terms",
      span: 2 as const,
    },
  ];

  const columns = [
    { key: "name", label: "Campaign Name" },
    {
      key: "range",
      label: "Purchase Range (BSK)",
      render: (row: BSKCampaign) => (
        <span className="font-mono text-sm">
          {row.min_purchase_bsk.toLocaleString()} - {row.max_purchase_bsk.toLocaleString()}
        </span>
      ),
    },
    {
      key: "bonus",
      label: "Bonus",
      render: (row: BSKCampaign) => (
        <span className="font-semibold text-primary">
          {row.bonus_percent}% {row.destination === 'holding' ? '(Holding)' : '(Withdrawable)'}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: BSKCampaign) => (
        <Badge
          variant={row.status === "live" ? "default" : "outline"}
          className={cn(
            row.status === "live"
              ? "bg-success/10 text-success border-success/20"
              : row.status === "paused"
              ? "bg-warning/10 text-warning border-warning/20"
              : "bg-muted text-muted-foreground"
          )}
        >
          {row.status}
        </Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading campaigns...</p>
      </div>
    );
  }

  const liveCampaigns = campaigns.filter(c => c.status === 'live');
  const totalBonus = campaigns.reduce((sum, c) => sum + c.bonus_percent, 0) / (campaigns.length || 1);

  return (
    <div className="space-y-4 pb-6">
      {/* Metrics */}
      <CardLane title="Campaign Overview">
        <KPIStat
          label="Live Campaigns"
          value={liveCampaigns.length.toString()}
          icon={<TrendingUp className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Total Campaigns"
          value={campaigns.length.toString()}
          icon={<Gift className="w-4 h-4" />}
        />
        <KPIStat
          label="Average Bonus"
          value={`${totalBonus.toFixed(1)}%`}
          icon={<Percent className="w-4 h-4" />}
        />
      </CardLane>

      {/* Main Content */}
      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">BSK Purchase Bonus Campaigns</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage bonus offers for BSK purchases (1,000 - 100,000 BSK)
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>

        <DataGridAdaptive
          data={campaigns}
          columns={columns}
          keyExtractor={(item) => item.id}
          renderCard={(item, selected) => (
            <RecordCard
              id={item.id}
              title={item.name}
              subtitle={`${item.bonus_percent}% Bonus - ${item.destination}`}
              fields={[
                {
                  label: "Range",
                  value: `${item.min_purchase_bsk.toLocaleString()} - ${item.max_purchase_bsk.toLocaleString()} BSK`,
                },
                {
                  label: "Bonus",
                  value: `${item.bonus_percent}% to ${item.destination}`,
                },
              ]}
              status={{
                label: item.status,
                variant: item.status === "live" ? "success" : "default",
              }}
              onClick={() => setSelectedRecord(item)}
              selected={selected}
              actions={[
                {
                  label: "Edit",
                  icon: Edit2,
                  onClick: () => handleEdit(item),
                },
                {
                  label: "Delete",
                  icon: Trash2,
                  onClick: () => handleDelete(item.id),
                  variant: "destructive",
                },
              ]}
            />
          )}
          onRowClick={(row) => setSelectedRecord(row)}
          selectable
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCampaign ? "Edit Campaign" : "Create New Campaign"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <FormKit fields={formFields} layout="2col" changes={formChanges} />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingCampaign ? "Update" : "Create"} Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      {selectedRecord && (
        <DetailSheet
          open={!!selectedRecord}
          onOpenChange={(open) => !open && setSelectedRecord(null)}
          title={selectedRecord.name}
          actions={{
            primary: {
              label: "Edit Campaign",
              onClick: () => handleEdit(selectedRecord),
            },
            secondary: {
              label: "Delete Campaign",
              onClick: () => {
                setSelectedRecord(null);
                handleDelete(selectedRecord.id);
              },
            },
          }}
        >
          <div className="space-y-6">
            {/* Campaign Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Purchase Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Minimum Purchase</p>
                  <p className="font-semibold">{selectedRecord.min_purchase_bsk.toLocaleString()} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Maximum Purchase</p>
                  <p className="font-semibold">{selectedRecord.max_purchase_bsk.toLocaleString()} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bonus Percentage</p>
                  <p className="font-semibold text-primary">{selectedRecord.bonus_percent}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bonus Destination</p>
                  <p className="font-semibold capitalize">{selectedRecord.destination}</p>
                </div>
              </div>
            </div>

            {/* Campaign Schedule */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Campaign Schedule</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={selectedRecord.status === "live" ? "default" : "outline"}
                    className={cn(
                      selectedRecord.status === "live"
                        ? "bg-success/10 text-success border-success/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {selectedRecord.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-semibold">
                    {selectedRecord.start_at
                      ? new Date(selectedRecord.start_at).toLocaleString()
                      : "Immediate"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">End Date</p>
                  <p className="font-semibold">
                    {selectedRecord.end_at
                      ? new Date(selectedRecord.end_at).toLocaleString()
                      : "No Expiry"}
                  </p>
                </div>
              </div>
            </div>

            {/* Example Calculations */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Example Calculations</h3>
              <div className="space-y-3 bg-muted/20 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Purchase 10,000 BSK with IPG:</p>
                  <p className="font-mono text-sm">
                    → 10,000 BSK (withdrawable) + {(10000 * selectedRecord.bonus_percent / 100).toLocaleString()} BSK ({selectedRecord.destination})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Purchase 50,000 BSK with IPG:</p>
                  <p className="font-mono text-sm">
                    → 50,000 BSK (withdrawable) + {(50000 * selectedRecord.bonus_percent / 100).toLocaleString()} BSK ({selectedRecord.destination})
                  </p>
                </div>
              </div>
            </div>

            {selectedRecord.description && (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Description</h3>
                <p className="text-sm text-muted-foreground">{selectedRecord.description}</p>
              </div>
            )}
          </div>
        </DetailSheet>
      )}
    </div>
  );
}
