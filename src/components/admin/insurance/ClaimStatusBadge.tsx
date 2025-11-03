import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ClaimStatusBadgeProps {
  status: 'submitted' | 'in_review' | 'approved' | 'rejected' | 'paid';
  className?: string;
}

export const ClaimStatusBadge = ({ status, className }: ClaimStatusBadgeProps) => {
  const variants = {
    submitted: { label: 'Submitted', variant: 'secondary' as const },
    in_review: { label: 'In Review', variant: 'default' as const },
    approved: { label: 'Approved', variant: 'default' as const },
    rejected: { label: 'Rejected', variant: 'destructive' as const },
    paid: { label: 'Paid', variant: 'default' as const }
  };

  const config = variants[status];

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        status === 'approved' && 'bg-success/20 text-success border-success/40',
        status === 'paid' && 'bg-primary/20 text-primary border-primary/40',
        className
      )}
    >
      {config.label}
    </Badge>
  );
};
