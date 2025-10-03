import { useState, useEffect } from "react";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, ExternalLink, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PurchaseRequest {
  id: string;
  user_id: string;
  email: string;
  purchase_amount: number;
  bscscan_link: string;
  transaction_hash: string;
  screenshot_url: string | null;
  admin_bep20_address: string;
  status: string;
  admin_notes: string | null;
  bsk_amount: number | null;
  created_at: string;
}

export default function AdminManualPurchases() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<PurchaseRequest | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [settingsDialog, setSettingsDialog] = useState(false);
  const { toast } = useToast();

  const [reviewData, setReviewData] = useState({
    bsk_amount: "",
    admin_notes: "",
  });

  const [settingsData, setSettingsData] = useState({
    admin_bep20_address: "",
    min_purchase_amount: "1000",
    max_purchase_amount: "100000",
    instructions: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsRes, settingsRes] = await Promise.all([
        supabase
          .from("bsk_manual_purchase_requests")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("bsk_purchase_settings")
          .select("*")
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (requestsRes.error) throw requestsRes.error;
      if (settingsRes.error) throw settingsRes.error;

      setRequests(requestsRes.data || []);
      setSettings(settingsRes.data);

      if (settingsRes.data) {
        setSettingsData({
          admin_bep20_address: settingsRes.data.admin_bep20_address,
          min_purchase_amount: settingsRes.data.min_purchase_amount.toString(),
          max_purchase_amount: settingsRes.data.max_purchase_amount.toString(),
          instructions: settingsRes.data.instructions || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRecord) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update request status
      const { error } = await supabase
        .from("bsk_manual_purchase_requests")
        .update({
          status: "approved",
          bsk_amount: parseFloat(reviewData.bsk_amount),
          admin_notes: reviewData.admin_notes,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", selectedRecord.id);

      if (error) throw error;

      // Credit BSK to user's withdrawable balance
      const { error: balanceError } = await supabase
        .from("user_bsk_balances")
        .upsert({
          user_id: selectedRecord.user_id,
          withdrawable_balance: parseFloat(reviewData.bsk_amount),
          total_earned_withdrawable: parseFloat(reviewData.bsk_amount),
        }, {
          onConflict: "user_id",
          ignoreDuplicates: false,
        });

      if (balanceError) throw balanceError;

      toast({
        title: "Approved",
        description: `${reviewData.bsk_amount} BSK credited to user`,
      });

      setReviewDialog(false);
      setSelectedRecord(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!selectedRecord) return;

    try {
      const { error } = await supabase
        .from("bsk_manual_purchase_requests")
        .update({
          status: "rejected",
          admin_notes: reviewData.admin_notes,
          rejected_reason: reviewData.admin_notes,
        })
        .eq("id", selectedRecord.id);

      if (error) throw error;

      toast({
        title: "Rejected",
        description: "Purchase request rejected",
      });

      setReviewDialog(false);
      setSelectedRecord(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (settings) {
        // Update existing
        const { error } = await supabase
          .from("bsk_purchase_settings")
          .update({
            admin_bep20_address: settingsData.admin_bep20_address,
            min_purchase_amount: parseFloat(settingsData.min_purchase_amount),
            max_purchase_amount: parseFloat(settingsData.max_purchase_amount),
            instructions: settingsData.instructions,
          })
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("bsk_purchase_settings")
          .insert({
            admin_bep20_address: settingsData.admin_bep20_address,
            min_purchase_amount: parseFloat(settingsData.min_purchase_amount),
            max_purchase_amount: parseFloat(settingsData.max_purchase_amount),
            instructions: settingsData.instructions,
            created_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Saved",
        description: "Purchase settings updated",
      });

      setSettingsDialog(false);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const columns = [
    { key: "email", label: "Email" },
    {
      key: "amount",
      label: "Amount",
      render: (row: PurchaseRequest) => (
        <span className="font-mono">{row.purchase_amount.toLocaleString()} BSK</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: PurchaseRequest) => (
        <Badge
          variant={
            row.status === "approved"
              ? "default"
              : row.status === "rejected"
              ? "destructive"
              : "outline"
          }
          className={cn(
            row.status === "approved" && "bg-success/10 text-success border-success/20",
            row.status === "pending" && "bg-warning/10 text-warning border-warning/20"
          )}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "created",
      label: "Submitted",
      render: (row: PurchaseRequest) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const totalBSK = requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + (r.bsk_amount || 0), 0);

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-4 pb-6">
      <CardLane title="Purchase Requests Overview">
        <KPIStat
          label="Pending Requests"
          value={pendingCount.toString()}
          icon={<Clock className="w-4 h-4" />}
          variant="warning"
        />
        <KPIStat
          label="Approved"
          value={approvedCount.toString()}
          icon={<CheckCircle2 className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Total BSK Issued"
          value={totalBSK.toLocaleString()}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-heading font-bold">Manual BSK Purchase Requests</h1>
          <Button size="sm" variant="outline" onClick={() => setSettingsDialog(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <DataGridAdaptive
              data={requests.filter((r) => r.status === "pending")}
              columns={columns}
              keyExtractor={(item) => item.id}
              renderCard={(item, selected) => (
                <RecordCard
                  id={item.id}
                  title={item.email}
                  subtitle={`${item.purchase_amount.toLocaleString()} BSK`}
                  fields={[
                    { label: "TX Hash", value: item.transaction_hash.slice(0, 16) + "..." },
                    { label: "Status", value: item.status },
                  ]}
                  status={{ label: item.status, variant: "warning" }}
                  onClick={() => {
                    setSelectedRecord(item);
                    setReviewData({
                      bsk_amount: item.purchase_amount.toString(),
                      admin_notes: "",
                    });
                    setReviewDialog(true);
                  }}
                  selected={selected}
                />
              )}
              onRowClick={(row) => {
                setSelectedRecord(row);
                setReviewData({
                  bsk_amount: row.purchase_amount.toString(),
                  admin_notes: "",
                });
                setReviewDialog(true);
              }}
              selectable
            />
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <DataGridAdaptive
              data={requests}
              columns={columns}
              keyExtractor={(item) => item.id}
              renderCard={(item, selected) => (
                <RecordCard
                  id={item.id}
                  title={item.email}
                  subtitle={`${item.purchase_amount.toLocaleString()} BSK`}
                  fields={[
                    { label: "TX Hash", value: item.transaction_hash.slice(0, 16) + "..." },
                    { label: "Status", value: item.status },
                  ]}
                  status={{
                    label: item.status,
                    variant:
                      item.status === "approved"
                        ? "success"
                        : item.status === "rejected"
                        ? "default"
                        : "warning",
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
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Purchase Request</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-semibold">{selectedRecord.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Purchase Amount</Label>
                  <p className="font-semibold">{selectedRecord.purchase_amount.toLocaleString()} BSK</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Transaction Hash</Label>
                  <p className="font-mono text-sm">{selectedRecord.transaction_hash}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">BSCScan Link</Label>
                  <a
                    href={selectedRecord.bscscan_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    View Transaction <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {selectedRecord.screenshot_url && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Screenshot Proof</Label>
                    <img
                      src={selectedRecord.screenshot_url}
                      alt="Payment proof"
                      className="mt-2 max-w-full rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label>BSK Amount to Credit</Label>
                  <Input
                    type="number"
                    value={reviewData.bsk_amount}
                    onChange={(e) => setReviewData({ ...reviewData, bsk_amount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Admin Notes</Label>
                  <Textarea
                    value={reviewData.admin_notes}
                    onChange={(e) => setReviewData({ ...reviewData, admin_notes: e.target.value })}
                    placeholder="Add any notes about this request..."
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  className="flex-1 bg-success hover:bg-success/90"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Approve & Send BSK
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialog} onOpenChange={setSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Purchase Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Admin BEP20 Address *</Label>
              <Input
                value={settingsData.admin_bep20_address}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, admin_bep20_address: e.target.value })
                }
                placeholder="0x..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Purchase (BSK)</Label>
                <Input
                  type="number"
                  value={settingsData.min_purchase_amount}
                  onChange={(e) =>
                    setSettingsData({ ...settingsData, min_purchase_amount: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Max Purchase (BSK)</Label>
                <Input
                  type="number"
                  value={settingsData.max_purchase_amount}
                  onChange={(e) =>
                    setSettingsData({ ...settingsData, max_purchase_amount: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Instructions for Users</Label>
              <Textarea
                value={settingsData.instructions}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, instructions: e.target.value })
                }
                placeholder="Add instructions for users..."
              />
            </div>
            <Button onClick={saveSettings} className="w-full">
              Save Settings
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      {selectedRecord && !reviewDialog && (
        <DetailSheet
          open={!!selectedRecord && !reviewDialog}
          onOpenChange={(open) => !open && setSelectedRecord(null)}
          title={`Request from ${selectedRecord.email}`}
        >
          <div className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Badge
                variant={
                  selectedRecord.status === "approved"
                    ? "default"
                    : selectedRecord.status === "rejected"
                    ? "destructive"
                    : "outline"
                }
                className="mt-1"
              >
                {selectedRecord.status}
              </Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Purchase Amount</Label>
              <p className="font-semibold">{selectedRecord.purchase_amount.toLocaleString()} BSK</p>
            </div>
            {selectedRecord.bsk_amount && (
              <div>
                <Label className="text-muted-foreground">BSK Credited</Label>
                <p className="font-semibold text-success">{selectedRecord.bsk_amount.toLocaleString()} BSK</p>
              </div>
            )}
            {selectedRecord.admin_notes && (
              <div>
                <Label className="text-muted-foreground">Admin Notes</Label>
                <p className="text-sm">{selectedRecord.admin_notes}</p>
              </div>
            )}
          </div>
        </DetailSheet>
      )}
    </div>
  );
}
