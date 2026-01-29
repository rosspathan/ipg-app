import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CleanCard } from "@/components/admin/clean/CleanCard";
import { CleanGrid } from "@/components/admin/clean/CleanGrid";
import { Wallet, TrendingUp, Lock, Landmark, AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface UserBalanceOverviewProps {
  userId: string;
}

export function UserBalanceOverview({ userId }: UserBalanceOverviewProps) {
  const isMobile = useIsMobile();
  
  const { data: bskBalance, isLoading: loadingBSK } = useQuery({
    queryKey: ["user-bsk-balance", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bsk_balances")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: inrBalance, isLoading: loadingINR } = useQuery({
    queryKey: ["user-inr-balance", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_inr_balances")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: cryptoBalances, isLoading: loadingCrypto } = useQuery({
    queryKey: ["user-crypto-balances", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallet_balances")
        .select(`
          *,
          assets:asset_id (symbol, name, logo_url)
        `)
        .eq("user_id", userId);

      if (error) throw error;
      return data;
    },
  });

  // Fetch loan history for the user
  const { data: loanHistory, isLoading: loadingLoans } = useQuery({
    queryKey: ["user-loan-history", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bsk_loans")
        .select("*")
        .eq("user_id", userId)
        .order("applied_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate loan summary
  const loanSummary = {
    totalLoans: loanHistory?.length || 0,
    totalBorrowed: loanHistory?.reduce((sum, loan) => sum + (loan.principal_bsk || 0), 0) || 0,
    totalPaid: loanHistory?.reduce((sum, loan) => sum + (loan.paid_bsk || 0), 0) || 0,
    activeLoans: loanHistory?.filter(l => l.status === 'active' || l.status === 'overdue').length || 0,
    totalOutstanding: loanHistory?.reduce((sum, loan) => {
      if (loan.status === 'active' || loan.status === 'overdue') {
        return sum + (loan.outstanding_bsk || 0);
      }
      return sum;
    }, 0) || 0,
  };

  const getLoanStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30"><Clock className="w-3 h-3 mr-1" />Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-danger/10 text-danger border-danger/30"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loadingBSK || loadingINR || loadingCrypto || loadingLoans) {
    return (
      <CleanGrid cols={isMobile ? 1 : 4} gap="md">
        {[1, 2, 3, 4].map((i) => (
          <CleanCard key={i} padding="md">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </CleanCard>
        ))}
      </CleanGrid>
    );
  }

  return (
    <div className="space-y-4">
      <CleanGrid cols={isMobile ? 1 : 4} gap="md">
        <CleanCard padding="md">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h4 className="text-sm font-medium text-foreground">BSK Balance</h4>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-foreground">
              {(bskBalance?.withdrawable_balance || 0).toFixed(2)} BSK
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Withdrawable: {(bskBalance?.withdrawable_balance || 0).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              Holding: {(bskBalance?.holding_balance || 0).toFixed(2)}
            </p>
          </div>
        </CleanCard>

        <CleanCard padding="md">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h4 className="text-sm font-medium text-foreground">INR Balance</h4>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-foreground">
              ₹{(inrBalance?.balance || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Locked: ₹{(inrBalance?.locked || 0).toFixed(2)}
            </p>
          </div>
        </CleanCard>

        <CleanCard padding="md">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h4 className="text-sm font-medium text-foreground">Crypto Assets</h4>
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-foreground">{cryptoBalances?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Different assets</p>
          </div>
        </CleanCard>

        {/* Loan Summary Card */}
        <CleanCard padding="md">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h4 className="text-sm font-medium text-foreground">Loan Summary</h4>
            <Landmark className="h-4 w-4 text-warning" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-foreground">
              {loanSummary.totalLoans} Loans
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total Borrowed: {loanSummary.totalBorrowed.toFixed(2)} BSK
            </p>
            <p className="text-xs text-muted-foreground">
              Outstanding: <span className={loanSummary.totalOutstanding > 0 ? "text-warning" : "text-success"}>{loanSummary.totalOutstanding.toFixed(2)} BSK</span>
            </p>
          </div>
        </CleanCard>
      </CleanGrid>

      {cryptoBalances && cryptoBalances.length > 0 && (
        <CleanCard padding="md">
          <h4 className="font-semibold text-foreground mb-3">Crypto Asset Details</h4>
          <div className="space-y-2">
            {cryptoBalances.map((balance: any) => (
              <div key={balance.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-card border border-border/40 rounded-lg gap-2">
                <div className="flex items-center gap-2">
                  {balance.assets?.logo_url && (
                    <img src={balance.assets.logo_url} alt="" className="h-6 w-6" />
                  )}
                  <div>
                    <div className="font-medium text-foreground">{balance.assets?.symbol}</div>
                    <div className="text-xs text-muted-foreground">{balance.assets?.name}</div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-medium text-foreground">{parseFloat(balance.available).toFixed(6)}</div>
                  <div className="text-xs text-muted-foreground">
                    Locked: {parseFloat(balance.locked).toFixed(6)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CleanCard>
      )}

      {/* Loan History Section */}
      {loanHistory && loanHistory.length > 0 && (
        <CleanCard padding="md">
          <h4 className="font-semibold text-foreground mb-3">Loan History</h4>
          <div className="space-y-2">
            {loanHistory.map((loan: any) => (
              <div key={loan.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-card border border-border/40 rounded-lg gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">
                      {loan.loan_number || loan.id.substring(0, 8)}
                    </span>
                    {getLoanStatusBadge(loan.status)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Applied: {format(new Date(loan.applied_at), "dd MMM yyyy")}
                    {loan.tenor_weeks && ` • ${loan.tenor_weeks} weeks`}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-medium text-foreground">
                    {(loan.principal_bsk || 0).toFixed(2)} BSK
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Paid: {(loan.paid_bsk || 0).toFixed(2)} / {(loan.total_due_bsk || 0).toFixed(2)} BSK
                  </div>
                  {(loan.status === 'active' || loan.status === 'overdue') && (
                    <div className="text-xs text-warning">
                      Outstanding: {(loan.outstanding_bsk || 0).toFixed(2)} BSK
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CleanCard>
      )}

      {/* No loans message */}
      {(!loanHistory || loanHistory.length === 0) && (
        <CleanCard padding="md">
          <div className="text-center py-4 text-muted-foreground">
            <Landmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No loan history for this user</p>
          </div>
        </CleanCard>
      )}
    </div>
  );
}
