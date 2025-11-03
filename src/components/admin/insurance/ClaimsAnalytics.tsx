import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { KpiChip } from "@/components/ui/kpi-chip";
import { FileCheck, TrendingUp, Clock, DollarSign } from "lucide-react";

export const ClaimsAnalytics = () => {
  const { data: stats } = useQuery({
    queryKey: ['insurance-claims-stats'],
    queryFn: async () => {
      // Pending claims
      const { data: pending, error: pendingError } = await supabase
        .from('insurance_bsk_claims')
        .select('approved_amount_inr')
        .in('status', ['submitted', 'in_review'])
        .eq('requires_manual_review', true);

      if (pendingError) throw pendingError;

      // Today's approvals
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayApprovals, error: todayError } = await supabase
        .from('insurance_bsk_claims')
        .select('approved_amount_inr, payout_bsk')
        .eq('status', 'approved')
        .gte('reviewed_at', today.toISOString());

      if (todayError) throw todayError;

      // This month's payouts
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const { data: monthPayouts, error: monthError } = await supabase
        .from('insurance_bsk_claims')
        .select('payout_bsk')
        .eq('status', 'paid')
        .gte('reviewed_at', firstDayOfMonth.toISOString());

      if (monthError) throw monthError;

      // Average processing time
      const { data: allClaims, error: allError } = await supabase
        .from('insurance_bsk_claims')
        .select('submitted_at, reviewed_at')
        .not('reviewed_at', 'is', null)
        .order('reviewed_at', { ascending: false })
        .limit(100);

      if (allError) throw allError;

      const avgProcessingTime = allClaims.reduce((acc, claim) => {
        const submitted = new Date(claim.submitted_at!);
        const reviewed = new Date(claim.reviewed_at!);
        const hours = (reviewed.getTime() - submitted.getTime()) / (1000 * 60 * 60);
        return acc + hours;
      }, 0) / (allClaims.length || 1);

      return {
        pendingCount: pending.length,
        pendingValue: pending.reduce((sum, c) => sum + (c.approved_amount_inr || 0), 0),
        todayApprovals: todayApprovals.length,
        todayBskPaid: todayApprovals.reduce((sum, c) => sum + (c.payout_bsk || 0), 0),
        monthlyPayouts: monthPayouts.reduce((sum, c) => sum + (c.payout_bsk || 0), 0),
        avgProcessingHours: Math.round(avgProcessingTime)
      };
    },
    refetchInterval: 60000 // Refresh every minute
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <KpiChip
            icon={FileCheck}
            value={stats?.pendingCount || 0}
            label="Pending Claims"
            variant="warning"
          />
          <p className="text-sm text-muted-foreground mt-2">
            Total Value: ₹{stats?.pendingValue.toLocaleString() || 0}
          </p>
        </Card>

        <Card className="p-4">
          <KpiChip
            icon={TrendingUp}
            value={stats?.todayApprovals || 0}
            label="Today's Approvals"
            variant="success"
          />
          <p className="text-sm text-muted-foreground mt-2">
            BSK Paid: {stats?.todayBskPaid.toLocaleString() || 0}
          </p>
        </Card>

        <Card className="p-4">
          <KpiChip
            icon={DollarSign}
            value={`${stats?.monthlyPayouts.toLocaleString() || 0} BSK`}
            label="This Month's Payouts"
            variant="primary"
          />
        </Card>

        <Card className="p-4">
          <KpiChip
            icon={Clock}
            value={`${stats?.avgProcessingHours || 0}h`}
            label="Avg Processing Time"
            variant="default"
          />
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Claims Overview</h3>
        <p className="text-muted-foreground">
          Detailed charts and analytics coming soon. This dashboard provides real-time monitoring
          of insurance claims processing, approval rates, and payout metrics.
        </p>
      </Card>
    </div>
  );
};
