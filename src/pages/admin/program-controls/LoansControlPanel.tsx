import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLoanManagement } from "@/hooks/useLoanManagement";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function LoansControlPanel() {
  const { config, applications, loans, updateConfig, reviewApplication } = useLoanManagement();
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [configEdit, setConfigEdit] = useState<any>(null);

  const pendingApps = applications.filter((a: any) => a.status === 'pending');
  const totalDisbursed = loans.reduce((sum: number, l: any) => sum + Number(l.principal_amount), 0);
  const totalOutstanding = loans.reduce((sum: number, l: any) => sum + Number(l.remaining_amount), 0);

  const handleReview = (applicationId: string, status: 'approved' | 'rejected') => {
    reviewApplication({ applicationId, status, adminNotes: reviewNotes });
    setSelectedApp(null);
    setReviewNotes("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">BSK Loans Control Panel</h1>
          <p className="text-muted-foreground">Manage loan configurations and applications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Pending Applications</div>
          <div className="text-2xl font-bold text-orange-600">{pendingApps.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Active Loans</div>
          <div className="text-2xl font-bold">{loans.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Total Disbursed</div>
          <div className="text-2xl font-bold">{totalDisbursed.toFixed(0)} BSK</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Outstanding</div>
          <div className="text-2xl font-bold">{totalOutstanding.toFixed(0)} BSK</div>
        </Card>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="loans">Active Loans</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          {pendingApps.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No pending applications</p>
            </Card>
          ) : (
            pendingApps.map((app: any) => (
              <Card key={app.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>Pending</Badge>
                      <span className="text-sm text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="font-semibold">{app.user?.display_name || app.user?.username}</div>
                    <div className="text-lg font-bold">{Number(app.requested_amount).toFixed(2)} BSK</div>
                    <div className="text-sm text-muted-foreground">Purpose: {app.loan_purpose}</div>
                    {app.bsk_balance && (
                      <div className="text-sm">Current BSK Balance: {Number(app.bsk_balance[0]?.withdrawable_balance || 0).toFixed(2)} BSK</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setSelectedApp(app)}>Review</Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="loans">
          <Card className="p-6">
            <div className="space-y-4">
              {loans.map((loan: any) => (
                <div key={loan.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <div className="font-semibold">{loan.user?.display_name || loan.user?.username}</div>
                    <div className="text-sm text-muted-foreground">Principal: {Number(loan.principal_amount).toFixed(2)} BSK</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={loan.status === 'active' ? 'default' : 'destructive'}>{loan.status}</Badge>
                    <div className="text-sm text-muted-foreground">Remaining: {Number(loan.remaining_amount).toFixed(2)} BSK</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Loan Configuration</h3>
            {config && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min Loan Amount (BSK)</Label>
                    <div className="font-semibold">{config.min_loan_amount}</div>
                  </div>
                  <div>
                    <Label>Max Loan Amount (BSK)</Label>
                    <div className="font-semibold">{config.max_loan_amount}</div>
                  </div>
                  <div>
                    <Label>Interest Rate (%)</Label>
                    <div className="font-semibold">{config.interest_rate_percent}%</div>
                  </div>
                  <div>
                    <Label>Duration (weeks)</Label>
                    <div className="font-semibold">{config.duration_weeks}</div>
                  </div>
                  <div>
                    <Label>Processing Fee (%)</Label>
                    <div className="font-semibold">{config.processing_fee_percent}%</div>
                  </div>
                  <div>
                    <Label>Late Fee</Label>
                    <div className="font-semibold">{config.late_payment_fee} BSK</div>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setConfigEdit(config)}>Edit Configuration</Button>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Loan Application</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              <div>
                <Label>Applicant</Label>
                <div className="font-semibold">{selectedApp.user?.display_name}</div>
              </div>
              <div>
                <Label>Requested Amount</Label>
                <div className="font-semibold">{Number(selectedApp.requested_amount).toFixed(2)} BSK</div>
              </div>
              <div>
                <Label>Purpose</Label>
                <div>{selectedApp.loan_purpose}</div>
              </div>
              <div>
                <Label>Admin Notes</Label>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Enter review notes..." />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleReview(selectedApp.id, 'approved')}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleReview(selectedApp.id, 'rejected')}>
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
