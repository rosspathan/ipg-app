import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ClaimStatusBadge } from "./ClaimStatusBadge";
import { CheckCircle, XCircle, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ClaimDetailModalProps {
  claim: any;
  open: boolean;
  onClose: () => void;
}

export const ClaimDetailModal = ({ claim, open, onClose }: ClaimDetailModalProps) => {
  const [approvedAmount, setApprovedAmount] = useState(claim.approved_amount_inr?.toString() || '');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: async ({ action }: { action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.functions.invoke('insurance-claim-process', {
        body: {
          claim_id: claim.id,
          action,
          approved_amount_inr: action === 'approve' ? parseFloat(approvedAmount) : undefined,
          admin_notes: adminNotes || undefined,
          rejection_reason: action === 'reject' ? rejectionReason : undefined
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pending-insurance-claims'] });
      queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
      toast.success(`Claim ${variables.action === 'approve' ? 'approved' : 'rejected'} successfully`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(`Failed to process claim: ${error.message}`);
    }
  });

  const user = claim.policy?.user;
  const policy = claim.policy;
  const plan = policy?.plan;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Claim Review - CLM-{claim.id.slice(0, 8).toUpperCase()}</span>
            <ClaimStatusBadge status={claim.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Claim Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Claim Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Claim Reference</Label>
                <p className="font-mono">CLM-{claim.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Claim Type</Label>
                <p className="capitalize">{claim.claim_type?.replace('_', ' ')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Submitted Date</Label>
                <p>{format(new Date(claim.submitted_at), 'PPpp')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Requested Amount</Label>
                <p className="font-semibold">₹{claim.approved_amount_inr?.toLocaleString() || '0'}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground">Description</Label>
                <p className="text-sm bg-muted p-3 rounded-md">{claim.description || 'No description provided'}</p>
              </div>
              {claim.incident_date && (
                <div>
                  <Label className="text-muted-foreground">Incident Date</Label>
                  <p>{format(new Date(claim.incident_date), 'PP')}</p>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Policy Details */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Policy Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Policy ID</Label>
                <p className="font-mono text-sm">{policy?.id.slice(0, 8)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Plan Name</Label>
                <p>{plan?.plan_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Coverage Limit</Label>
                <p className="font-semibold">{plan?.max_coverage_bsk} BSK</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Policy Status</Label>
                <Badge variant={policy?.status === 'active' ? 'default' : 'secondary'}>
                  {policy?.status}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Policy Period</Label>
                <p className="text-sm">
                  {format(new Date(policy?.start_at), 'PP')} - {format(new Date(policy?.end_at), 'PP')}
                </p>
              </div>
            </div>
          </section>

          <Separator />

          {/* User Information */}
          <section>
            <h3 className="text-lg font-semibold mb-3">User Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Name</Label>
                <p>{user?.full_name || user?.display_name || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p>{user?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Username</Label>
                <p>@{user?.username}</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Evidence Documents */}
          {claim.evidence_documents && (
            <section>
              <h3 className="text-lg font-semibold mb-3">Evidence Documents</h3>
              <div className="space-y-2">
                {Array.isArray(claim.evidence_documents) && claim.evidence_documents.length > 0 ? (
                  claim.evidence_documents.map((doc: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{doc.name || `Document ${idx + 1}`}</span>
                      </div>
                      <Button size="sm" variant="outline">
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No documents uploaded</p>
                )}
              </div>
            </section>
          )}

          <Separator />

          {/* Admin Action Panel */}
          <section>
            <h3 className="text-lg font-semibold mb-3">Admin Actions</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="approved-amount">Approved Amount (INR)</Label>
                <Input
                  id="approved-amount"
                  type="number"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  placeholder="Enter approved amount"
                />
              </div>

              <div>
                <Label htmlFor="admin-notes">Admin Notes</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this claim review..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="rejection-reason">Rejection Reason (if rejecting)</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Detailed reason for rejection..."
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({ action: 'approve' })}
                  disabled={reviewMutation.isPending || !approvedAmount}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Claim
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => reviewMutation.mutate({ action: 'reject' })}
                  disabled={reviewMutation.isPending || !rejectionReason}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Claim
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
