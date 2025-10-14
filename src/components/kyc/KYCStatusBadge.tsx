import { Clock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KYCStatusBadgeProps {
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  className?: string;
}

export function KYCStatusBadge({ status, className }: KYCStatusBadgeProps) {
  const config = {
    draft: {
      icon: FileText,
      color: 'bg-muted text-muted-foreground',
      label: 'Draft'
    },
    submitted: {
      icon: Clock,
      color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500',
      label: 'Under Review'
    },
    approved: {
      icon: CheckCircle,
      color: 'bg-green-500/10 text-green-600 dark:text-green-500',
      label: 'Verified'
    },
    rejected: {
      icon: XCircle,
      color: 'bg-red-500/10 text-red-600 dark:text-red-500',
      label: 'Rejected'
    }
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <Badge className={cn('flex items-center gap-1.5', color, className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
