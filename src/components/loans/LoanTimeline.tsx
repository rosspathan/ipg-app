import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  FileText,
  Calendar,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LoanTimelineProps {
  loanId: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  type: 'application' | 'approval' | 'disbursement' | 'payment' | 'late_fee' | 'cancellation' | 'closure';
  title: string;
  description: string;
  amount?: number;
  icon: React.ReactNode;
  variant: 'default' | 'success' | 'warning' | 'destructive';
}

export function LoanTimeline({ loanId }: LoanTimelineProps) {
  const { data: loan, isLoading: loanLoading } = useQuery({
    queryKey: ['loan-detail', loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loans')
        .select('*')
        .eq('id', loanId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: ledgerEntries, isLoading: ledgerLoading } = useQuery({
    queryKey: ['loan-ledger', loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loan_ledger')
        .select('*')
        .eq('loan_id', loanId)
        .order('processed_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: installments } = useQuery({
    queryKey: ['loan-installments', loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bsk_loan_installments')
        .select('*')
        .eq('loan_id', loanId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  if (loanLoading || ledgerLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading timeline...</p>
        </CardContent>
      </Card>
    );
  }

  if (!loan) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loan not found</p>
        </CardContent>
      </Card>
    );
  }

  // Build timeline events
  const events: TimelineEvent[] = [];

  // Application
  events.push({
    id: `app-${loan.id}`,
    date: loan.created_at,
    type: 'application',
    title: 'Loan Application Submitted',
    description: `Applied for ${loan.principal_bsk} BSK (₹${loan.amount_inr})`,
    amount: loan.principal_bsk,
    icon: <FileText className="w-4 h-4" />,
    variant: 'default'
  });

  // Approval
  if (loan.approved_at) {
    events.push({
      id: `approval-${loan.id}`,
      date: loan.approved_at,
      type: 'approval',
      title: 'Loan Approved',
      description: loan.approved_by ? `Approved by admin` : 'Application approved',
      icon: <CheckCircle className="w-4 h-4" />,
      variant: 'success'
    });
  }

  // Disbursement
  if (loan.disbursed_at) {
    events.push({
      id: `disburse-${loan.id}`,
      date: loan.disbursed_at,
      type: 'disbursement',
      title: 'Loan Disbursed',
      description: `${loan.principal_bsk} BSK disbursed to withdrawable balance`,
      amount: loan.principal_bsk,
      icon: <DollarSign className="w-4 h-4" />,
      variant: 'success'
    });
  }

  // Payments and late fees from ledger
  ledgerEntries?.forEach((entry) => {
    if (entry.transaction_type === 'payment') {
      events.push({
        id: entry.id,
        date: entry.processed_at,
        type: 'payment',
        title: 'EMI Payment',
        description: `Paid ${Math.abs(entry.amount_bsk)} BSK`,
        amount: Math.abs(entry.amount_bsk),
        icon: <CheckCircle className="w-4 h-4" />,
        variant: 'success'
      });
    } else if (entry.transaction_type === 'late_fee') {
      events.push({
        id: entry.id,
        date: entry.processed_at,
        type: 'late_fee',
        title: 'Late Fee Applied',
        description: `Late fee: ${Math.abs(entry.amount_bsk)} BSK`,
        amount: Math.abs(entry.amount_bsk),
        icon: <AlertCircle className="w-4 h-4" />,
        variant: 'warning'
      });
    }
  });

  // Cancellation
  if (loan.status === 'cancelled') {
    events.push({
      id: `cancel-${loan.id}`,
      date: loan.updated_at || loan.created_at,
      type: 'cancellation',
      title: 'Loan Cancelled',
      description: loan.admin_notes || 'Loan cancelled due to non-payment',
      icon: <XCircle className="w-4 h-4" />,
      variant: 'destructive'
    });
  }

  // Closure
  if (loan.status === 'closed' && loan.closed_at) {
    events.push({
      id: `close-${loan.id}`,
      date: loan.closed_at,
      type: 'closure',
      title: 'Loan Closed',
      description: 'Loan fully repaid and closed',
      icon: <CheckCircle className="w-4 h-4" />,
      variant: 'success'
    });
  }

  // Sort by date (newest first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getVariantClasses = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800';
      case 'destructive':
        return 'bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800';
      default:
        return 'bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Loan Timeline
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete history of loan events and transactions
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="relative">
              {index !== events.length - 1 && (
                <div className="absolute left-4 top-10 bottom-0 w-0.5 bg-border" />
              )}
              <div className="flex gap-4">
                <div className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2",
                  getVariantClasses(event.variant)
                )}>
                  {event.icon}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold">{event.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {format(new Date(event.date), 'MMM dd, yyyy HH:mm')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                  {event.amount && (
                    <p className="text-sm font-mono font-semibold mt-1">
                      {event.amount} BSK
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Installment Schedule */}
        {installments && installments.length > 0 && (
          <>
            <Separator className="my-6" />
            <div className="space-y-2">
              <h4 className="font-semibold text-sm mb-3">Payment Schedule</h4>
              <div className="grid gap-2">
                {installments.map((inst) => (
                  <div 
                    key={inst.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-sm",
                      inst.status === 'paid' && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800",
                      inst.status === 'overdue' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800",
                      inst.status === 'due' && "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold">#{inst.installment_number}</span>
                      <Badge variant={
                        inst.status === 'paid' ? 'default' : 
                        inst.status === 'overdue' ? 'destructive' : 
                        'outline'
                      }>
                        {inst.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        Due: {format(new Date(inst.due_date), 'MMM dd')}
                      </span>
                    </div>
                    <span className="font-mono font-semibold">
                      {inst.total_due_bsk} BSK
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
