import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { DataGridAdaptive } from "@/components/admin/nova/DataGridAdaptive";
import { RecordCard } from "@/components/admin/nova/RecordCard";
import { DetailSheet } from "@/components/admin/nova/DetailSheet";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { CleanMetricCard } from "@/components/admin/clean/CleanMetricCard";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { EmptyState } from "@/components/admin/clean/EmptyState";
import { CheckCircle, XCircle, Clock, DollarSign, Users, Wallet, RefreshCw, Settings, Shield, Percent, FileText, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export default function AdminBSKLoansNova() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  
  // Local state for form values
  const [formValues, setFormValues] = useState<{
    id?: string;
    system_enabled: boolean;
    kyc_required: boolean;
    min_amount_bsk: number;
    max_amount_bsk: number;
    default_tenor_weeks: number;
    processing_fee_percent: number;
    late_fee_percent: number;
    consecutive_missed_weeks_for_cancel: number;
  } | null>(null);

  // Fetch loan configuration
  const { data: loanConfig, isLoading: configLoading } = useQuery({
    queryKey: ['bsk-loan-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loan_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  // Initialize form values when config is loaded
  useEffect(() => {
    if (loanConfig && !formValues) {
      setFormValues(loanConfig);
    }
  }, [loanConfig, formValues]);

  // Fetch loan applications
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ['bsk-loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loans')
        .select(`
          *,
          profiles(email, full_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Update config mutation
  const updateConfig = useMutation({
    mutationFn: async (updates: any) => {
      if (!loanConfig?.id) throw new Error('No config found');
      const { error } = await supabase
        .from('bsk_loan_settings')
        .update(updates)
        .eq('id', loanConfig.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loan-config'] });
      toast({ title: "Configuration saved successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveConfig = () => {
    if (!formValues) return;
    updateConfig.mutate(formValues);
  };

  // Approve loan mutation - calls edge function
  const approveLoan = useMutation({
    mutationFn: async ({ applicationId, notes }: { applicationId: string; notes?: string }) => {
      const { data, error } = await supabase.functions.invoke('bsk-loan-disburse', {
        body: { 
          loan_id: applicationId, 
          action: 'approve',
          admin_notes: notes 
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loans'] });
      toast({ title: "Loan approved and disbursed successfully" });
      setSelectedApplication(null);
      setAdminNotes("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Reject loan mutation - calls edge function
  const rejectLoan = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('bsk-loan-disburse', {
        body: { 
          loan_id: applicationId, 
          action: 'reject',
          admin_notes: reason 
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loans'] });
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
  const cancelledCount = applications?.filter(a => a.status === 'cancelled').length || 0;
  const totalDisbursed = applications
    ?.filter(a => ['approved', 'active', 'closed'].includes(a.status))
    .reduce((sum, a) => sum + Number(a.net_disbursed_bsk || a.principal_bsk), 0) || 0;

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
        <div className="font-mono font-medium">{Number(row.principal_bsk).toFixed(2)} BSK</div>
      )
    },
    {
      key: "duration",
      label: "Duration",
      render: (row: any) => `${row.tenor_weeks} weeks`
    },
    {
      key: "outstanding",
      label: "Outstanding",
      render: (row: any) => (
        <div className="font-mono text-sm">{Number(row.outstanding_bsk).toFixed(2)} BSK</div>
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
                  : row.status === 'closed'
                  ? "bg-muted/10 text-muted-foreground border-muted/20"
                  : row.status === 'cancelled'
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              )}
            >
              {row.status}
            </Badge>
      )
    }
  ];

  const testCancellation = async () => {
    try {
      toast({ title: "Testing cancellation check...", description: "Invoking edge function" });
      const { data, error } = await supabase.functions.invoke('bsk-loan-check-cancellation', {
        body: { triggered_by: 'admin_manual' }
      });
      if (error) throw error;
      toast({ 
        title: "Cancellation check complete", 
        description: `Processed ${data?.processed || 0} loans, Cancelled: ${data?.cancelled || 0}`,
      });
      queryClient.invalidateQueries({ queryKey: ['bsk-loans'] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Header Section */}
      <div className="space-y-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(0_0%_98%)]">Loan Management</h1>
            <p className="text-sm text-[hsl(220_9%_65%)] mt-1">Configure and manage BSK loans</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['bsk-loans'] });
                queryClient.invalidateQueries({ queryKey: ['bsk-loan-config'] });
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={testCancellation}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Test Cancellation
            </Button>
          </div>
        </div>
        
        {/* Status indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${loanConfig?.system_enabled ? 'bg-[hsl(152_64%_48%)]' : 'bg-[hsl(0_84%_60%)]'}`} />
          <span className="text-[hsl(220_9%_65%)]">
            Loan program {loanConfig?.system_enabled ? 'active' : 'paused'}
          </span>
        </div>
      </div>

      {/* KPI Metrics */}
      <CleanGrid cols={4} gap="md" className="px-4">
        <CleanMetricCard
          label="Pending Applications"
          value={pendingCount}
          icon={Clock}
          delta={pendingCount > 0 ? { value: pendingCount, trend: "up" } : undefined}
        />
        <CleanMetricCard
          label="Active Loans"
          value={activeCount}
          icon={Users}
        />
        <CleanMetricCard
          label="Total Disbursed"
          value={`${totalDisbursed.toLocaleString()} BSK`}
          icon={Wallet}
        />
        <CleanMetricCard
          label="Cancelled Loans"
          value={cancelledCount}
          icon={XCircle}
        />
      </CleanGrid>

      <div className="px-4 space-y-4">

        <Tabs defaultValue="applications" className="w-full">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4 mt-4">
            {/* Configuration Summary */}
            {loanConfig && (
              <CleanCard padding="md" className="bg-[hsl(262_100%_65%/0.05)] border-[hsl(262_100%_65%/0.2)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-[hsl(262_100%_65%/0.1)]">
                      <Settings className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-[hsl(220_9%_65%)]">Limit:</span>
                        <span className="ml-2 font-mono font-semibold text-[hsl(0_0%_98%)]">
                          {loanConfig.min_amount_bsk} - {loanConfig.max_amount_bsk} BSK
                        </span>
                      </div>
                      <div>
                        <span className="text-[hsl(220_9%_65%)]">Duration:</span>
                        <span className="ml-2 font-semibold text-[hsl(0_0%_98%)]">{loanConfig.default_tenor_weeks} weeks</span>
                      </div>
                      <div>
                        <span className="text-[hsl(220_9%_65%)]">Fee:</span>
                        <span className="ml-2 font-semibold text-[hsl(0_0%_98%)]">{loanConfig.processing_fee_percent}%</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const settingsTab = document.querySelector('[value="settings"]') as HTMLElement;
                      settingsTab?.click();
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Settings
                  </Button>
                </div>
              </CleanCard>
            )}

            {applications?.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No loan applications yet"
                description="When users apply for loans, they'll appear here for review."
              />
            ) : (
              <DataGridAdaptive
              data={applications || []}
              columns={columns}
              keyExtractor={(item) => item.id}
              renderCard={(item, selected) => (
                <RecordCard
                  id={item.id}
                  title={item.profiles?.email || 'Unknown'}
                  subtitle={`${Number(item.principal_bsk).toFixed(2)} BSK`}
                  fields={[
                    { label: "Duration", value: `${item.tenor_weeks} weeks` },
                    { label: "Outstanding", value: `${Number(item.outstanding_bsk).toFixed(2)} BSK` },
                    { label: "Created", value: new Date(item.created_at).toLocaleDateString() }
                  ]}
                  status={{
                    label: item.status,
                    variant: item.status === 'approved' || item.status === 'active' ? 'success' : item.status === 'pending' ? 'warning' : 'default'
                  }}
                  onClick={() => setSelectedApplication(item)}
                  selected={selected}
                />
              )}
              onRowClick={(row) => setSelectedApplication(row)}
              selectable
            />
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 mt-4">
            {configLoading ? (
              <div className="text-center py-8 text-[hsl(220_9%_65%)]">Loading...</div>
            ) : !loanConfig || !formValues ? (
              <EmptyState
                icon={Settings}
                title="No configuration found"
                description="Loan configuration is missing. Please contact support."
              />
            ) : (
              <div className="space-y-6">
                {/* Section 1: Program Status */}
                <CleanCard padding="lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-xl ${formValues.system_enabled ? 'bg-[hsl(152_64%_48%/0.1)]' : 'bg-[hsl(0_84%_60%/0.1)]'}`}>
                        {formValues.system_enabled ? 
                          <CheckCircle className="w-6 h-6 text-[hsl(152_64%_48%)]" /> : 
                          <XCircle className="w-6 h-6 text-[hsl(0_84%_60%)]" />
                        }
                      </div>
                      <div>
                        <h3 className="font-semibold text-[hsl(0_0%_98%)]">Loan Program Status</h3>
                        <p className="text-sm text-[hsl(220_9%_65%)]">
                          {formValues.system_enabled ? 'Users can apply for loans' : 'Loan applications are paused'}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={formValues.system_enabled} 
                      onCheckedChange={(checked) => {
                        setFormValues({ ...formValues, system_enabled: checked });
                      }}
                    />
                  </div>
                </CleanCard>

                {/* Section 2: Loan Limits */}
                <CleanCard padding="lg">
                  <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                    Loan Limits
                  </h3>
                  <CleanGrid cols={2} gap="md">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[hsl(0_0%_98%)]">Minimum Amount</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formValues.min_amount_bsk}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setFormValues({ ...formValues, min_amount_bsk: value });
                          }}
                          min="0"
                          className="pl-10 h-12 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
                        />
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(262_100%_65%)]" />
                      </div>
                      <span className="text-xs text-[hsl(220_9%_65%)]">In BSK tokens</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[hsl(0_0%_98%)]">Maximum Amount</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formValues.max_amount_bsk}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setFormValues({ ...formValues, max_amount_bsk: value });
                          }}
                          min="0"
                          className="pl-10 h-12 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
                        />
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(262_100%_65%)]" />
                      </div>
                      <span className="text-xs text-[hsl(220_9%_65%)]">In BSK tokens</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[hsl(0_0%_98%)]">Duration</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formValues.default_tenor_weeks}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setFormValues({ ...formValues, default_tenor_weeks: value });
                          }}
                          min="1"
                          className="pl-10 h-12 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
                        />
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(262_100%_65%)]" />
                      </div>
                      <span className="text-xs text-[hsl(220_9%_65%)]">In weeks</span>
                    </div>
                  </CleanGrid>
                </CleanCard>

                {/* Section 3: Fee Structure */}
                <CleanCard padding="lg">
                  <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-4 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                    Fee Structure
                  </h3>
                  <CleanGrid cols={2} gap="md">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[hsl(0_0%_98%)]">Processing Fee</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          value={formValues.processing_fee_percent}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setFormValues({ ...formValues, processing_fee_percent: value });
                          }}
                          min="0"
                          max="100"
                          className="pl-10 h-12 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
                        />
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(262_100%_65%)]" />
                      </div>
                      <span className="text-xs text-[hsl(220_9%_65%)]">Percentage of loan amount</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[hsl(0_0%_98%)]">Late Payment Fee</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.1"
                          value={formValues.late_fee_percent}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setFormValues({ ...formValues, late_fee_percent: value });
                          }}
                          min="0"
                          max="100"
                          className="pl-10 h-12 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
                        />
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(262_100%_65%)]" />
                      </div>
                      <span className="text-xs text-[hsl(220_9%_65%)]">Additional fee per missed week</span>
                    </div>
                  </CleanGrid>
                </CleanCard>

                {/* Section 4: Risk Management */}
                <CleanCard padding="lg">
                  <h3 className="text-base font-semibold text-[hsl(0_0%_98%)] mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[hsl(262_100%_65%)]" />
                    Risk Management
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium text-[hsl(0_0%_98%)]">KYC Required</Label>
                        <p className="text-sm text-[hsl(220_9%_65%)]">Require KYC verification before loan application</p>
                      </div>
                      <Switch
                        checked={formValues.kyc_required}
                        onCheckedChange={(checked) => {
                          setFormValues({ ...formValues, kyc_required: checked });
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[hsl(0_0%_98%)]">Auto-cancel Threshold</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          value={formValues.consecutive_missed_weeks_for_cancel}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            setFormValues({ ...formValues, consecutive_missed_weeks_for_cancel: value });
                          }}
                          min="1"
                          className="pl-10 h-12 bg-[hsl(220_13%_10%)] border-[hsl(220_13%_14%/0.4)] text-[hsl(0_0%_98%)]"
                        />
                        <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(262_100%_65%)]" />
                      </div>
                      <span className="text-xs text-[hsl(220_9%_65%)]">
                        Consecutive missed weeks before loan is auto-cancelled
                      </span>
                    </div>
                  </div>
                </CleanCard>

                {/* Sticky Save Button */}
                <div className="sticky bottom-0 bg-[hsl(220_13%_7%)]/80 backdrop-blur-sm py-4 border-t border-[hsl(220_13%_14%/0.4)]">
                  <div className="flex justify-end gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (loanConfig) setFormValues(loanConfig);
                      }}
                    >
                      Reset Changes
                    </Button>
                    <Button 
                      onClick={handleSaveConfig} 
                      disabled={updateConfig.isPending}
                      className="bg-[hsl(262_100%_65%)] hover:bg-[hsl(262_100%_70%)]"
                    >
                      {updateConfig.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save Configuration
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
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
                  <p className="text-2xl font-bold">{Number(selectedApplication.principal_bsk).toFixed(2)} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-lg font-bold">{selectedApplication.tenor_weeks} weeks</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-medium">{Number(selectedApplication.outstanding_bsk).toFixed(2)} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Due</p>
                  <p className="text-lg font-medium">{Number(selectedApplication.total_due_bsk).toFixed(2)} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className="text-sm font-medium">{selectedApplication.interest_rate_weekly}% weekly</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing Fee</p>
                  <p className="text-sm font-medium">{Number(selectedApplication.origination_fee_bsk).toFixed(2)} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Disbursed</p>
                  <p className="text-sm font-medium">{Number(selectedApplication.net_disbursed_bsk).toFixed(2)} BSK</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Applied</p>
                <p className="text-sm font-medium">{new Date(selectedApplication.created_at).toLocaleString()}</p>
              </div>

              {selectedApplication.admin_notes && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Admin Notes</p>
                  <p className="text-sm bg-muted/50 p-3 rounded">{selectedApplication.admin_notes}</p>
                </div>
              )}

              {selectedApplication.status === 'pending' && (
                <>
                  <div className="space-y-4 pt-4 border-t border-border">
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
