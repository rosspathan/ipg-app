import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { LoanHistoryEvent } from "@/hooks/useLoanHistory";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Coins,
  ArrowDownCircle,
  ArrowUpCircle,
  Percent,
  Landmark,
} from "lucide-react";

const eventConfig: Record<
  string,
  { icon: React.ElementType; iconBg: string; iconColor: string }
> = {
  application_submitted: {
    icon: FileText,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  loan_approved: {
    icon: CheckCircle2,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  loan_disbursed: {
    icon: ArrowDownCircle,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  emi_paid: {
    icon: CheckCircle2,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  emi_auto_deducted: {
    icon: Clock,
    iconBg: "bg-muted/50",
    iconColor: "text-muted-foreground",
  },
  emi_overdue: {
    icon: AlertTriangle,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  settlement_paid: {
    icon: Coins,
    iconBg: "bg-info/10",
    iconColor: "text-info",
  },
  settlement_disbursal: {
    icon: ArrowUpCircle,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  loan_completed: {
    icon: Landmark,
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  loan_foreclosed: {
    icon: XCircle,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  loan_forfeited: {
    icon: XCircle,
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  late_fee_applied: {
    icon: Percent,
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
  },
  processing_fee: {
    icon: Percent,
    iconBg: "bg-muted/50",
    iconColor: "text-muted-foreground",
  },
};

interface LoanActivityTimelineProps {
  events: LoanHistoryEvent[];
  isLoading?: boolean;
  showLoanNumber?: boolean;
  maxItems?: number;
}

export function LoanActivityTimeline({
  events,
  isLoading = false,
  showLoanNumber = false,
  maxItems,
}: LoanActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  const displayEvents = maxItems ? events.slice(0, maxItems) : events;

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-5 bottom-5 w-px bg-border" />

      <div className="space-y-1">
        {displayEvents.map((event, index) => {
          const config = eventConfig[event.event_type] || {
            icon: Clock,
            iconBg: "bg-muted/50",
            iconColor: "text-muted-foreground",
          };
          const Icon = config.icon;

          return (
            <div
              key={event.id}
              className={cn(
                "relative flex gap-3 p-3 rounded-xl transition-colors",
                "hover:bg-muted/30"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border border-border/50",
                  config.iconBg
                )}
              >
                <Icon className={cn("w-4 h-4", config.iconColor)} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {event.amount_bsk && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-xs tabular-nums",
                          event.variant === "success" && "bg-success/10 text-success border-success/30",
                          event.variant === "destructive" && "bg-destructive/10 text-destructive border-destructive/30",
                          event.variant === "warning" && "bg-warning/10 text-warning border-warning/30",
                          event.variant === "info" && "bg-primary/10 text-primary border-primary/30"
                        )}
                      >
                        {(() => {
                          const dir = (event.metadata as any)?.direction as
                            | "debit"
                            | "credit"
                            | undefined;
                          if (dir === "debit") return "-";
                          if (dir === "credit") return "+";

                          // Fallback for older events
                          if (event.event_type.includes("fee")) return "-";
                          if (event.event_type === "emi_paid") return "-";
                          if (event.event_type === "settlement_paid") return "-";
                          if (event.event_type.includes("disbursal") || event.event_type === "loan_completed")
                            return "+";
                          return "";
                        })()}
                        {Math.abs(event.amount_bsk).toFixed(2)} BSK
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {format(new Date(event.created_at), "dd MMM, HH:mm")}
                    </span>
                  </div>
                </div>

                {/* Additional metadata */}
                {event.metadata?.reason && (
                  <div className="mt-2 p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="text-xs text-destructive">
                      <span className="font-medium">Reason:</span> {event.metadata.reason}
                    </p>
                  </div>
                )}

                {showLoanNumber && event.loan_id && (
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    Loan: {event.loan_id.slice(0, 8)}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {maxItems && events.length > maxItems && (
        <div className="text-center pt-4">
          <p className="text-xs text-muted-foreground">
            +{events.length - maxItems} more events
          </p>
        </div>
      )}
    </div>
  );
}
