import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { LoanStatus } from "@/hooks/useLoansOverview";

export function LoanStatusPill({ status }: { status: LoanStatus }) {
  if (status === "active") {
    return (
      <Badge
        variant="outline"
        className="bg-primary/10 text-primary border-primary/30 text-[10px] px-2 py-0.5"
      >
        <Clock className="w-3 h-3 mr-1" />
        Active
      </Badge>
    );
  }

  if (status === "overdue" || status === "in_arrears") {
    return (
      <Badge
        variant="outline"
        className="bg-warning/10 text-warning border-warning/30 text-[10px] px-2 py-0.5"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Overdue
      </Badge>
    );
  }

  if (status === "completed" || status === "closed") {
    return (
      <Badge
        variant="outline"
        className="bg-success/10 text-success border-success/30 text-[10px] px-2 py-0.5"
      >
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Completed
      </Badge>
    );
  }

  if (status === "cancelled") {
    return (
      <Badge
        variant="outline"
        className="bg-destructive/10 text-destructive border-destructive/30 text-[10px] px-2 py-0.5"
      >
        <AlertCircle className="w-3 h-3 mr-1" />
        Cancelled
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-[10px] px-2 py-0.5">
      {String(status)}
    </Badge>
  );
}
