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
  withdrawable_amount: number;
  holding_bonus_amount: number;
  total_received: number;
  payment_method: string;
  bscscan_link: string | null;
  transaction_hash: string | null;
  utr_number: string | null;
  payer_name: string | null;
  payer_contact: string | null;
  screenshot_url: string | null;
  admin_bep20_address: string | null;
  status: string;
  admin_notes: string | null;
  rejected_reason: string | null;
  bsk_amount: number | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
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
    admin_upi_id: "",
    admin_bank_name: "",
    admin_account_number: "",
    admin_ifsc_code: "",
    admin_account_holder: "",
    min_purchase_amount: "1000",
    max_purchase_amount: "100000",
    fee_percent: "0",
    fee_fixed: "0",
    instructions: "",
    payment_methods_enabled: ["BEP20"] as string[],
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
          admin_upi_id: settingsRes.data.admin_upi_id || "",
          admin_bank_name: settingsRes.data.admin_bank_name || "",
          admin_account_number: settingsRes.data.admin_account_number || "",
          admin_ifsc_code: settingsRes.data.admin_ifsc_code || "",
          admin_account_holder: settingsRes.data.admin_account_holder || "",
          min_purchase_amount: settingsRes.data.min_purchase_amount.toString(),
          max_purchase_amount: settingsRes.data.max_purchase_amount.toString(),
          fee_percent: settingsRes.data.fee_percent?.toString() || "0",
          fee_fixed: settingsRes.data.fee_fixed?.toString() || "0",
          instructions: settingsRes.data.instructions || "",
          payment_methods_enabled: settingsRes.data.payment_methods_enabled || ["BEP20"],
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

      const withdrawableAmount = selectedRecord.withdrawable_amount || selectedRecord.purchase_amount;
      const holdingAmount = selectedRecord.holding_bonus_amount || (selectedRecord.purchase_amount * 0.5);
      const totalAmount = selectedRecord.total_received || (selectedRecord.purchase_amount * 1.5);

      // Update request status
      const { error } = await supabase
        .from("bsk_manual_purchase_requests")
        .update({
          status: "approved",
          bsk_amount: totalAmount,
          admin_notes: reviewData.admin_notes,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", selectedRecord.id);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_actions_log').insert({
        admin_user_id: user.id,
        action_type: 'bsk_purchase_approved',
        target_table: 'bsk_manual_purchase_requests',
        target_id: selectedRecord.id,
        details: {
          user_id: selectedRecord.user_id,
          amount: totalAmount,
          withdrawable: withdrawableAmount,
          holding: holdingAmount,
          payment_method: selectedRecord.payment_method,
          admin_notes: reviewData.admin_notes
        }
      });

      // Credit both withdrawable and holding balances atomically (race-condition safe)
      const { data: balanceResult, error: balanceError } = await supabase.rpc(
        'admin_credit_manual_purchase',
        {
          p_user_id: selectedRecord.user_id,
          p_withdrawable_amount: withdrawableAmount,
          p_holding_amount: holdingAmount,
        }
      );

      if (balanceError || !(balanceResult as any)?.success) {
        throw new Error((balanceResult as any)?.error || balanceError?.message || 'Failed to credit balance');
      }

      toast({
        title: "Approved",
        description: `${totalAmount.toLocaleString()} BSK credited (${withdrawableAmount.toLocaleString()} withdrawable + ${holdingAmount.toLocaleString()} holding)`,
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

    // ✅ ENFORCE MANDATORY REASON
    if (!reviewData.admin_notes || reviewData.admin_notes.trim().length === 0) {
      toast({
        title: "Reason Required",
        description: "You must provide a reason for rejecting this purchase",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("bsk_manual_purchase_requests")
        .update({
          status: "rejected",
          admin_notes: reviewData.admin_notes,
          rejected_reason: reviewData.admin_notes,
        })
        .eq("id", selectedRecord.id);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_actions_log').insert({
        admin_user_id: user.id,
        action_type: 'bsk_purchase_rejected',
        target_table: 'bsk_manual_purchase_requests',
        target_id: selectedRecord.id,
        details: {
          user_id: selectedRecord.user_id,
          amount: selectedRecord.purchase_amount,
          reason: reviewData.admin_notes,
          payment_method: selectedRecord.payment_method
        }
      });

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
            admin_upi_id: settingsData.admin_upi_id || null,
            admin_bank_name: settingsData.admin_bank_name || null,
            admin_account_number: settingsData.admin_account_number || null,
            admin_ifsc_code: settingsData.admin_ifsc_code || null,
            admin_account_holder: settingsData.admin_account_holder || null,
            min_purchase_amount: parseFloat(settingsData.min_purchase_amount),
            max_purchase_amount: parseFloat(settingsData.max_purchase_amount),
            fee_percent: parseFloat(settingsData.fee_percent),
            fee_fixed: parseFloat(settingsData.fee_fixed),
            instructions: settingsData.instructions,
            payment_methods_enabled: settingsData.payment_methods_enabled,
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
            fee_percent: parseFloat(settingsData.fee_percent),
            fee_fixed: parseFloat(settingsData.fee_fixed),
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

  const exportToCSV = () => {
    const headers = [
      'ID', 'User Email', 'Amount (BSK)', 'Payment Method', 'Transaction Ref',
      'Status', 'Withdrawable', 'Holding Bonus', 'Total Received',
      'Submitted At', 'Decided At', 'Admin Notes'
    ];

    const rows = requests.map(r => [
      r.id,
      r.email,
      r.purchase_amount,
      r.payment_method,
      r.transaction_hash || r.utr_number || '',
      r.status,
      r.withdrawable_amount,
      r.holding_bonus_amount,
      r.total_received,
      new Date(r.created_at).toISOString(),
      r.approved_at || r.updated_at || '',
      r.admin_notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bsk-purchase-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: `${requests.length} records exported to CSV`,
    });
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
      key: "payment",
      label: "Payment",
      render: (row: PurchaseRequest) => (
        <span className="text-xs">{row.payment_method}</span>
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportToCSV} disabled={requests.length === 0}>
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSettingsDialog(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
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
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
                  <div>
                    <Label className="text-muted-foreground">Payment Method</Label>
                    <p className="font-semibold">{selectedRecord.payment_method}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Purchase Amount</Label>
                    <p className="font-semibold">{selectedRecord.purchase_amount.toLocaleString()} BSK</p>
                  </div>
                  
                  {selectedRecord.payment_method === 'BEP20' && selectedRecord.transaction_hash && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Transaction Hash</Label>
                      <p className="font-mono text-sm">{selectedRecord.transaction_hash}</p>
                    </div>
                  )}
                  
                  {(selectedRecord.payment_method === 'UPI' || selectedRecord.payment_method === 'IMPS') && selectedRecord.utr_number && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">UTR Number</Label>
                      <p className="font-mono text-sm">{selectedRecord.utr_number}</p>
                    </div>
                  )}
                  
                  {selectedRecord.payer_name && (
                    <div>
                      <Label className="text-muted-foreground">Payer Name</Label>
                      <p className="font-semibold">{selectedRecord.payer_name}</p>
                    </div>
                  )}
                  
                  {selectedRecord.payer_contact && (
                    <div>
                      <Label className="text-muted-foreground">Payer Contact</Label>
                      <p className="font-semibold">{selectedRecord.payer_contact}</p>
                    </div>
                  )}
                </div>

                {/* Bonus Breakdown */}
                <div className="p-4 bg-success/5 border border-success/20 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-success mb-2">🎁 Bonus Breakdown (+50% Holding)</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Withdrawable BSK:</span>
                      <span className="font-mono font-semibold">
                        {(selectedRecord.withdrawable_amount || selectedRecord.purchase_amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-success">
                      <span>Holding Bonus (+50%):</span>
                      <span className="font-mono font-semibold">
                        +{(selectedRecord.holding_bonus_amount || selectedRecord.purchase_amount * 0.5).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t border-success/20">
                      <span>Total User Receives:</span>
                      <span className="font-mono text-lg text-success">
                        {(selectedRecord.total_received || selectedRecord.purchase_amount * 1.5).toLocaleString()} BSK
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedRecord.bscscan_link && (
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
                  )}
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
                  <Label className={cn(
                    selectedRecord.status === 'pending' && "text-destructive"
                  )}>
                    Admin Notes {selectedRecord.status === 'pending' && "(Required for Rejection) *"}
                  </Label>
                  <Textarea
                    value={reviewData.admin_notes}
                    onChange={(e) => setReviewData({ ...reviewData, admin_notes: e.target.value })}
                    placeholder="Add notes or rejection reason..."
                    rows={3}
                    className={cn(
                      selectedRecord.status === 'pending' && 
                      !reviewData.admin_notes && 
                      "border-destructive/50"
                    )}
                  />
                  {selectedRecord.status === 'pending' && !reviewData.admin_notes && (
                    <p className="text-xs text-destructive mt-1">
                      Rejection requires a reason
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  className="flex-1"
                  disabled={!reviewData.admin_notes || reviewData.admin_notes.trim().length === 0}
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
              <Label>Payment Methods Enabled</Label>
              <div className="flex gap-2 mt-2">
                {['BEP20', 'UPI', 'IMPS'].map(method => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsData.payment_methods_enabled.includes(method)}
                      onChange={(e) => {
                        const methods = e.target.checked
                          ? [...settingsData.payment_methods_enabled, method]
                          : settingsData.payment_methods_enabled.filter(m => m !== method);
                        setSettingsData({ ...settingsData, payment_methods_enabled: methods });
                      }}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Admin BEP20 Address</Label>
              <Input
                value={settingsData.admin_bep20_address}
                onChange={(e) =>
                  setSettingsData({ ...settingsData, admin_bep20_address: e.target.value })
                }
                placeholder="0x..."
              />
            </div>
            <div>
              <Label>Admin UPI ID</Label>
              <Input
                value={settingsData.admin_upi_id}
                onChange={(e) => setSettingsData({ ...settingsData, admin_upi_id: e.target.value })}
                placeholder="yourname@upi"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={settingsData.admin_bank_name}
                  onChange={(e) => setSettingsData({ ...settingsData, admin_bank_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Account Holder</Label>
                <Input
                  value={settingsData.admin_account_holder}
                  onChange={(e) => setSettingsData({ ...settingsData, admin_account_holder: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Account Number</Label>
                <Input
                  value={settingsData.admin_account_number}
                  onChange={(e) => setSettingsData({ ...settingsData, admin_account_number: e.target.value })}
                />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input
                  value={settingsData.admin_ifsc_code}
                  onChange={(e) => setSettingsData({ ...settingsData, admin_ifsc_code: e.target.value })}
                />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fee Percentage (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settingsData.fee_percent}
                  onChange={(e) =>
                    setSettingsData({ ...settingsData, fee_percent: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  e.g., 2 = 2% fee on purchase amount
                </p>
              </div>
              <div>
                <Label>Fixed Fee (BSK)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={settingsData.fee_fixed}
                  onChange={(e) =>
                    setSettingsData({ ...settingsData, fee_fixed: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Flat fee added to every purchase
                </p>
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
