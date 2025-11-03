import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClaimStatusBadge } from "./ClaimStatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { ClaimDetailModal } from "./ClaimDetailModal";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const ClaimsQueue = () => {
  const [selectedClaim, setSelectedClaim] = useState<any>(null);

  const { data: claims, isLoading } = useQuery({
    queryKey: ['pending-insurance-claims'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_bsk_claims')
        .select('*')
        .in('status', ['submitted', 'in_review'])
        .eq('requires_manual_review', true)
        .order('submitted_at', { ascending: true });

      if (error) throw error;
      
      // Fetch related data separately for each claim
      const claimsWithDetails = await Promise.all(
        data.map(async (claim) => {
          // Get user profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, email, full_name')
            .eq('user_id', claim.user_id)
            .single();
          
          // Get policy
          const { data: policy } = await supabase
            .from('insurance_bsk_policies')
            .select('*')
            .eq('id', claim.policy_id)
            .single();
          
          // Get plan if policy exists (using plan_type)
          let plan = null;
          if (policy) {
            const { data: planData } = await supabase
              .from('insurance_bsk_plans')
              .select('*')
              .eq('plan_type', policy.plan_type)
              .single();
            plan = planData;
          }
          
          return {
            ...claim,
            policy: {
              ...policy,
              user: profile,
              plan: plan
            }
          };
        })
      );
      
      return claimsWithDetails;
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const calculateDaysPending = (submittedAt: string) => {
    const submitted = new Date(submittedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - submitted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">Loading claims...</p>
      </Card>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground">No pending claims requiring review.</p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim Reference</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Policy Type</TableHead>
              <TableHead>Claim Type</TableHead>
              <TableHead>Amount (INR)</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim) => {
              const daysPending = calculateDaysPending(claim.submitted_at);
              const user = claim.policy?.user;
              
              return (
                <TableRow key={claim.id}>
                  <TableCell className="font-mono text-sm">
                    CLM-{claim.id.slice(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.full_name || user?.display_name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>{claim.policy?.plan?.plan_name || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{claim.claim_type?.replace('_', ' ')}</TableCell>
                  <TableCell className="font-semibold">₹{claim.approved_amount_inr?.toLocaleString() || '0'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(claim.submitted_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <PriorityBadge daysPending={daysPending} />
                  </TableCell>
                  <TableCell>
                    <ClaimStatusBadge status={claim.status as any} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedClaim(claim)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {selectedClaim && (
        <ClaimDetailModal
          claim={selectedClaim}
          open={!!selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </>
  );
};
