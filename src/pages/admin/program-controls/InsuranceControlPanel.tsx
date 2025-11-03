import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInsuranceManagement } from "@/hooks/useInsuranceManagement";
import { ClaimsQueue } from "@/components/admin/insurance/ClaimsQueue";
import { ClaimsAnalytics } from "@/components/admin/insurance/ClaimsAnalytics";
import { AutoApprovalSettings } from "@/components/admin/insurance/AutoApprovalSettings";
import { Loader2, Plus, CheckCircle, XCircle, FileText, BarChart3, Shield, Users, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export default function InsuranceControlPanel() {
  const { plans, claims, policies, isLoading, createPlan, reviewClaim } = useInsuranceManagement();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const pendingClaims = claims.filter((c: any) => c.status === 'pending');
  const activePolicies = policies.filter((p: any) => p.status === 'active');

  const handleReview = (claimId: string, status: 'approved' | 'rejected') => {
    reviewClaim({ claimId, status, adminNotes: reviewNotes });
    setSelectedClaim(null);
    setReviewNotes("");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Insurance Control Panel</h1>
          <p className="text-muted-foreground">Manage insurance plans and review claims</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Pending Claims</div>
          <div className="text-2xl font-bold text-orange-600">{pendingClaims.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Active Policies</div>
          <div className="text-2xl font-bold">{activePolicies.length}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-muted-foreground">Active Plans</div>
          <div className="text-2xl font-bold">{plans.filter((p: any) => p.is_active).length}</div>
        </Card>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">
            <FileText className="w-4 h-4 mr-2" />
            Claims Queue
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="plans">
            <Shield className="w-4 h-4 mr-2" />
            Plans
          </TabsTrigger>
          <TabsTrigger value="policies">
            <Users className="w-4 h-4 mr-2" />
            Policies
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Auto-Approval
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <ClaimsQueue />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <ClaimsAnalytics />
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          {pendingClaims.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No pending claims</p>
            </Card>
          ) : (
            pendingClaims.map((claim: any) => (
              <Card key={claim.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>Pending Review</Badge>
                      <span className="text-sm text-muted-foreground">{new Date(claim.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="font-semibold">{claim.policy?.user?.display_name || claim.policy?.user?.username}</div>
                    <div className="text-sm text-muted-foreground">{claim.policy?.plan?.name}</div>
                    <div className="text-lg font-bold">{Number(claim.claim_amount_bsk).toFixed(2)} BSK</div>
                    <div className="text-sm">{claim.claim_reason}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setSelectedClaim(claim)}>Review</Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="plans">
          <Card className="p-6">
            <div className="space-y-4">
              {plans.map((plan: any) => (
                <div key={plan.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <div className="font-semibold">{plan.plan_name}</div>
                    <div className="text-sm text-muted-foreground">{plan.plan_type}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{plan.monthly_premium_bsk} BSK/month</div>
                    <div className="text-sm text-muted-foreground">Coverage: {plan.max_coverage_bsk} BSK</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="policies">
          <Card className="p-6">
            <div className="space-y-4">
              {activePolicies.slice(0, 20).map((policy: any) => (
                <div key={policy.id} className="flex justify-between items-center border-b pb-4">
                  <div>
                    <div className="font-semibold">{policy.user?.display_name || policy.user?.username}</div>
                    <div className="text-sm text-muted-foreground">{policy.plan?.name}</div>
                  </div>
                  <div className="text-right">
                    <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>{policy.status}</Badge>
                    <div className="text-sm text-muted-foreground">Since {new Date(policy.start_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AutoApprovalSettings />
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedClaim} onOpenChange={() => setSelectedClaim(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Claim</DialogTitle>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div>
                <Label>Claimant</Label>
                <div className="font-semibold">{selectedClaim.policy?.user?.display_name}</div>
              </div>
              <div>
                <Label>Amount</Label>
                <div className="font-semibold">{Number(selectedClaim.claim_amount_bsk).toFixed(2)} BSK</div>
              </div>
              <div>
                <Label>Reason</Label>
                <div>{selectedClaim.claim_reason}</div>
              </div>
              <div>
                <Label>Admin Notes</Label>
                <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Enter review notes..." />
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => handleReview(selectedClaim.id, 'approved')}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Approve
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => handleReview(selectedClaim.id, 'rejected')}>
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
