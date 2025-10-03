import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { CardLane } from "@/components/admin/nova/CardLane";
import { KPIStat } from "@/components/admin/nova/KPIStat";
import { CheckCircle, XCircle, Clock, DollarSign, Users, TrendingUp, Wallet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function AdminBSKLoansNova() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  // Fetch loan configuration
  const { data: loanConfig, isLoading: configLoading } = useQuery({
    queryKey: ['bsk-loan-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loan_configs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Fetch loan applications
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['bsk-loan-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loan_applications')
        .select(`
          *,
          profiles:user_id (email, full_name)
        `)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Update config mutation
  const updateConfig = useMutation({
    mutationFn: async (updates: any) => {
      if (!loanConfig?.id) throw new Error('No config found');
      const { error } = await supabase
        .from('bsk_loan_configs')
        .update(updates)
        .eq('id', loanConfig.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loan-config'] });
      toast({ title: "Loan configuration updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Approve loan mutation
  const approveLoan = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string; notes?: string }) => {
      const { error } = await supabase
        .from('bsk_loan_applications')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          notes: notes
        })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loan-applications'] });
      toast({ title: "Loan approved successfully" });
      setSelectedApplication(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Reject loan mutation
  const rejectLoan = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase
        .from('bsk_loan_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', applicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loan-applications'] });
      toast({ title: "Loan rejected" });
      setSelectedApplication(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const pendingCount = applications?.filter(a => a.status === 'pending').length || 0;
  const approvedCount = applications?.filter(a => a.status === 'approved').length || 0;
  const activeCount = applications?.filter(a => a.status === 'active').length || 0;
  const totalDisbursed = applications
    ?.filter(a => ['approved', 'active', 'completed'].includes(a.status))
    .reduce((sum, a) => sum + Number(a.loan_amount), 0) || 0;

  const columns = [
    {
      key: "user",
      label: "User",
      render: (row: any) => (
        <div>
          <div className="font-medium">{row.profiles?.email || 'N/A'}</div>
          <div className="text-xs text-muted-foreground">{row.profiles?.full_name || ''}</div>
        </div>
      )
    },
    {
      key: "loan_amount",
      label: "Amount",
      render: (row: any) => (
        <div className="font-mono font-medium">{Number(row.loan_amount).toLocaleString()} BSK</div>
      )
    },
    {
      key: "duration",
      label: "Duration",
      render: (row: any) => `${row.duration_weeks} weeks`
    },
    {
      key: "weekly_payment",
      label: "Weekly Payment",
      render: (row: any) => (
        <div className="font-mono text-sm">{Number(row.weekly_payment).toLocaleString()} BSK</div>
      )
    },
    {
      key: "status",
      label: "Status",
      render: (row: any) => (
        <Badge
          variant="outline"
          className={cn(
            row.status === 'approved' || row.status === 'active'
              ? "bg-success/10 text-success border-success/20"
              : row.status === 'pending'
              ? "bg-warning/10 text-warning border-warning/20"
              : row.status === 'rejected'
              ? "bg-destructive/10 text-destructive border-destructive/20"
              : "bg-muted/10 text-muted-foreground border-muted/20"
          )}
        >
          {row.status}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* KPI Lane */}
      <CardLane title="Loan Metrics">
        <KPIStat
          label="Pending"
          value={String(pendingCount)}
          icon={<Clock className="w-4 h-4" />}
          variant={pendingCount > 0 ? "warning" : undefined}
        />
        <KPIStat
          label="Approved"
          value={String(approvedCount)}
          icon={<CheckCircle className="w-4 h-4" />}
          variant="success"
        />
        <KPIStat
          label="Active Loans"
          value={String(activeCount)}
          icon={<Users className="w-4 h-4" />}
        />
        <KPIStat
          label="Total Disbursed"
          value={`${totalDisbursed.toLocaleString()}`}
          icon={<Wallet className="w-4 h-4" />}
          variant="success"
        />
      </CardLane>

      <div className="px-4 space-y-4">
        <h1 className="text-xl font-heading font-bold text-foreground">
          BSK Loan Management
        </h1>

        <Tabs defaultValue="applications" className="w-full">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4 mt-4">
            <DataGridAdaptive
              data={applications || []}
              columns={columns}
              keyExtractor={(item) => item.id}
              renderCard={(item, selected) => (
                <RecordCard
                  id={item.id}
                  title={item.profiles?.email || 'Unknown'}
                  subtitle={`${Number(item.loan_amount).toLocaleString()} BSK`}
                  fields={[
                    { label: "Duration", value: `${item.duration_weeks} weeks` },
                    { label: "Weekly", value: `${Number(item.weekly_payment).toLocaleString()} BSK` },
                    { label: "Applied", value: new Date(item.applied_at).toLocaleDateString() }
                  ]}
                  status={{
                    label: item.status,
                    variant: item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'default'
                  }}
                  onClick={() => setSelectedApplication(item)}
                  selected={selected}
                />
              )}
              onRowClick={(row) => setSelectedApplication(row)}
              selectable
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            {loanConfig && (
              <Card>
                <CardHeader>
                  <CardTitle>Loan Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Loan Program</Label>
                      <p className="text-sm text-muted-foreground">Allow users to apply for loans</p>
                    </div>
                    <Switch
                      checked={loanConfig.is_enabled}
                      onCheckedChange={(checked) => updateConfig.mutate({ is_enabled: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Minimum Loan Amount (BSK)</Label>
                      <Input
                        type="number"
                        value={loanConfig.min_loan_amount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          updateConfig.mutate({ min_loan_amount: value });
                        }}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Maximum Loan Amount (BSK)</Label>
                      <Input
                        type="number"
                        value={loanConfig.max_loan_amount}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          updateConfig.mutate({ max_loan_amount: value });
                        }}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration (Weeks)</Label>
                      <Input
                        type="number"
                        value={loanConfig.duration_weeks}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          updateConfig.mutate({ duration_weeks: value });
                        }}
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interest Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={loanConfig.interest_rate_percent}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          updateConfig.mutate({ interest_rate_percent: value });
                        }}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Processing Fee (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={loanConfig.processing_fee_percent}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          updateConfig.mutate({ processing_fee_percent: value });
                        }}
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Late Payment Fee (BSK)</Label>
                      <Input
                        type="number"
                        value={loanConfig.late_payment_fee}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          updateConfig.mutate({ late_payment_fee: value });
                        }}
                        min="0"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Application Detail Sheet */}
      <DetailSheet
        open={!!selectedApplication}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedApplication(null);
            setRejectionReason("");
            setAdminNotes("");
          }
        }}
        title={`Loan Application - ${selectedApplication?.profiles?.email || ''}`}
      >
        {selectedApplication && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  selectedApplication.status === 'approved' || selectedApplication.status === 'active'
                    ? "bg-success/10 text-success border-success/20"
                    : selectedApplication.status === 'pending'
                    ? "bg-warning/10 text-warning border-warning/20"
                    : "bg-destructive/10 text-destructive border-destructive/20"
                )}
              >
                {selectedApplication.status}
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Loan Amount</p>
                  <p className="text-2xl font-bold">{Number(selectedApplication.loan_amount).toLocaleString()} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-2xl font-bold">{selectedApplication.duration_weeks} weeks</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Payment</p>
                  <p className="text-lg font-medium">{Number(selectedApplication.weekly_payment).toLocaleString()} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Repayment</p>
                  <p className="text-lg font-medium">{Number(selectedApplication.total_repayment).toLocaleString()} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className="text-sm font-medium">{selectedApplication.interest_rate_percent}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing Fee</p>
                  <p className="text-sm font-medium">{Number(selectedApplication.processing_fee).toLocaleString()} BSK</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Applied</p>
                <p className="text-sm font-medium">{new Date(selectedApplication.applied_at).toLocaleString()}</p>
              </div>

              {selectedApplication.rejection_reason && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Rejection Reason</p>
                  <p className="text-sm bg-destructive/10 p-3 rounded">{selectedApplication.rejection_reason}</p>
                </div>
              )}

              {selectedApplication.notes && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Admin Notes</p>
                  <p className="text-sm bg-muted/50 p-3 rounded">{selectedApplication.notes}</p>
                </div>
              )}

              {selectedApplication.status === 'pending' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Admin Notes (optional)</Label>
                      <Textarea
                        placeholder="Add notes about this application..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => approveLoan.mutate({ 
                          applicationId: selectedApplication.id,
                          notes: adminNotes 
                        })}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Loan
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          if (!rejectionReason.trim()) {
                            toast({ 
                              title: "Rejection reason required", 
                              variant: "destructive" 
                            });
                            return;
                          }
                          rejectLoan.mutate({ 
                            applicationId: selectedApplication.id,
                            reason: rejectionReason 
                          });
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label>Rejection Reason (if rejecting)</Label>
                      <Textarea
                        placeholder="Explain why the loan is being rejected..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </DetailSheet>
    </div>
  );
}
