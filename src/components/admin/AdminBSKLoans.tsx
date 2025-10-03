import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, DollarSign, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminBSKLoans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [actionNotes, setActionNotes] = useState("");

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
  const { data: loanApplications, isLoading: loansLoading } = useQuery({
    queryKey: ['bsk-loan-applications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loan_applications')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('applied_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Update loan configuration
  const updateConfig = useMutation({
    mutationFn: async (updates: any) => {
      if (!loanConfig?.id) {
        const { data, error } = await supabase
          .from('bsk_loan_configs')
          .insert(updates)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('bsk_loan_configs')
        .update(updates)
        .eq('id', loanConfig.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loan-config'] });
      toast({ title: "Loan configuration updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error updating configuration", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  // Approve loan
  const approveLoan = useMutation({
    mutationFn: async ({ loanId, notes }: { loanId: string; notes: string }) => {
      const { data, error } = await supabase
        .from('bsk_loan_applications')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          notes: notes
        })
        .eq('id', loanId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loan-applications'] });
      toast({ title: "Loan approved successfully" });
      setSelectedLoan(null);
      setActionNotes("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error approving loan", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  // Reject loan
  const rejectLoan = useMutation({
    mutationFn: async ({ loanId, reason }: { loanId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('bsk_loan_applications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          notes: reason
        })
        .eq('id', loanId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bsk-loan-applications'] });
      toast({ title: "Loan rejected" });
      setSelectedLoan(null);
      setActionNotes("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error rejecting loan", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleSaveConfig = () => {
    if (!loanConfig) return;
    
    updateConfig.mutate({
      min_loan_amount: loanConfig.min_loan_amount,
      max_loan_amount: loanConfig.max_loan_amount,
      duration_weeks: loanConfig.duration_weeks,
      interest_rate_percent: loanConfig.interest_rate_percent,
      processing_fee_percent: loanConfig.processing_fee_percent,
      late_payment_fee: loanConfig.late_payment_fee,
      is_enabled: loanConfig.is_enabled
    });
  };

  const pendingLoans = loanApplications?.filter(l => l.status === 'pending') || [];
  const approvedLoans = loanApplications?.filter(l => l.status === 'approved') || [];
  const activeLoans = loanApplications?.filter(l => l.status === 'active') || [];
  const completedLoans = loanApplications?.filter(l => l.status === 'completed') || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'active': return 'default';
      case 'completed': return 'outline';
      case 'rejected': return 'destructive';
      case 'defaulted': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'active': return <DollarSign className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'defaulted': return <AlertCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  if (configLoading || loansLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">BSK Loan Program</h1>
          <p className="text-sm text-muted-foreground">Manage loan settings and applications</p>
        </div>
        <Badge variant={loanConfig?.is_enabled ? "default" : "destructive"}>
          {loanConfig?.is_enabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingLoans.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedLoans.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Active ({activeLoans.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedLoans.length})
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Loan Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enabled">Enable Loan Program</Label>
                  <p className="text-xs text-muted-foreground">Allow users to apply for loans</p>
                </div>
                <Switch
                  id="enabled"
                  checked={loanConfig?.is_enabled}
                  onCheckedChange={(checked) => 
                    updateConfig.mutate({ ...loanConfig, is_enabled: checked })
                  }
                />
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_amount">Minimum Loan Amount (BSK)</Label>
                  <Input
                    id="min_amount"
                    type="number"
                    value={loanConfig?.min_loan_amount || 100}
                    onChange={(e) => 
                      queryClient.setQueryData(['bsk-loan-config'], {
                        ...loanConfig,
                        min_loan_amount: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_amount">Maximum Loan Amount (BSK)</Label>
                  <Input
                    id="max_amount"
                    type="number"
                    value={loanConfig?.max_loan_amount || 25000}
                    onChange={(e) => 
                      queryClient.setQueryData(['bsk-loan-config'], {
                        ...loanConfig,
                        max_loan_amount: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Loan Duration (Weeks)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={loanConfig?.duration_weeks || 16}
                    onChange={(e) => 
                      queryClient.setQueryData(['bsk-loan-config'], {
                        ...loanConfig,
                        duration_weeks: parseInt(e.target.value)
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interest">Interest Rate (%)</Label>
                  <Input
                    id="interest"
                    type="number"
                    step="0.1"
                    value={loanConfig?.interest_rate_percent || 10}
                    onChange={(e) => 
                      queryClient.setQueryData(['bsk-loan-config'], {
                        ...loanConfig,
                        interest_rate_percent: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="processing_fee">Processing Fee (%)</Label>
                  <Input
                    id="processing_fee"
                    type="number"
                    step="0.1"
                    value={loanConfig?.processing_fee_percent || 2}
                    onChange={(e) => 
                      queryClient.setQueryData(['bsk-loan-config'], {
                        ...loanConfig,
                        processing_fee_percent: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="late_fee">Late Payment Fee (BSK)</Label>
                  <Input
                    id="late_fee"
                    type="number"
                    value={loanConfig?.late_payment_fee || 50}
                    onChange={(e) => 
                      queryClient.setQueryData(['bsk-loan-config'], {
                        ...loanConfig,
                        late_payment_fee: parseFloat(e.target.value)
                      })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveConfig} className="w-full">
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loan Applications Lists */}
        {['pending', 'approved', 'active', 'completed'].map((tabValue) => {
          const loans = tabValue === 'pending' ? pendingLoans :
                       tabValue === 'approved' ? approvedLoans :
                       tabValue === 'active' ? activeLoans : completedLoans;

          return (
            <TabsContent key={tabValue} value={tabValue}>
              <div className="space-y-3">
                {loans.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No {tabValue} loans
                    </CardContent>
                  </Card>
                ) : (
                  loans.map((loan: any) => (
                    <Card key={loan.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLoan(loan)}>
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{loan.profiles?.full_name || loan.profiles?.email}</p>
                              <Badge variant={getStatusColor(loan.status)}>
                                {getStatusIcon(loan.status)}
                                <span className="ml-1 capitalize">{loan.status}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{loan.profiles?.email}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span>Amount: {loan.loan_amount} BSK</span>
                              <span>Weekly: {loan.weekly_payment} BSK</span>
                              <span>Duration: {loan.duration_weeks} weeks</span>
                              <span>Interest: {loan.interest_rate_percent}%</span>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-lg font-bold">{loan.total_repayment} BSK</p>
                            <p className="text-xs text-muted-foreground">Total Repayment</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Loan Details Dialog */}
      <Dialog open={!!selectedLoan} onOpenChange={() => setSelectedLoan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loan Application Details</DialogTitle>
            <DialogDescription>
              Review and manage loan application
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Applicant</p>
                  <p className="font-medium">{selectedLoan.profiles?.full_name || selectedLoan.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedLoan.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loan Amount</p>
                  <p className="font-medium">{selectedLoan.loan_amount} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processing Fee</p>
                  <p className="font-medium">{selectedLoan.processing_fee} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className="font-medium">{selectedLoan.interest_rate_percent}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">{selectedLoan.duration_weeks} weeks</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weekly Payment</p>
                  <p className="font-medium">{selectedLoan.weekly_payment} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Repayment</p>
                  <p className="text-lg font-bold">{selectedLoan.total_repayment} BSK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Applied At</p>
                  <p className="font-medium">{new Date(selectedLoan.applied_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={getStatusColor(selectedLoan.status)}>
                    {getStatusIcon(selectedLoan.status)}
                    <span className="ml-1 capitalize">{selectedLoan.status}</span>
                  </Badge>
                </div>
              </div>

              {selectedLoan.status === 'pending' && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label htmlFor="action-notes">Admin Notes</Label>
                    <Textarea
                      id="action-notes"
                      placeholder="Add notes about this loan application..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => approveLoan.mutate({ loanId: selectedLoan.id, notes: actionNotes })}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Loan
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => rejectLoan.mutate({ loanId: selectedLoan.id, reason: actionNotes || 'Rejected by admin' })}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Loan
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {selectedLoan.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                    <p className="text-sm bg-muted p-3 rounded">{selectedLoan.notes}</p>
                  </div>
                </>
              )}

              {selectedLoan.rejection_reason && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rejection Reason</p>
                    <p className="text-sm bg-destructive/10 text-destructive p-3 rounded">{selectedLoan.rejection_reason}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
