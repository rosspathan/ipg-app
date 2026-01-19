import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KYCSubmissionWithUser } from '@/hooks/useAdminKYC';
import { cn } from '@/lib/utils';
import { User, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface KYCSubmissionListProps {
  submissions: KYCSubmissionWithUser[];
  selectedId?: string;
  onSelect: (submission: KYCSubmissionWithUser) => void;
}

export function KYCSubmissionList({ submissions, selectedId, onSelect }: KYCSubmissionListProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
      case 'in_review':
        return {
          color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          icon: Clock,
          label: 'Pending Review'
        };
      case 'approved':
        return {
          color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          icon: CheckCircle2,
          label: 'Approved'
        };
      case 'rejected':
        return {
          color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
          icon: XCircle,
          label: 'Rejected'
        };
      default:
        return {
          color: 'bg-muted text-muted-foreground border-border',
          icon: AlertCircle,
          label: status
        };
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <User className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-1">No submissions found</h3>
        <p className="text-muted-foreground text-sm">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((submission) => {
        const dataJson = submission.data_json || {};
        const fullName = submission.full_name_computed || submission.display_name || dataJson?.full_name || 'Unknown User';
        const email = submission.profile_email || submission.email_computed || dataJson?.email || '';
        const phone = submission.phone_computed || dataJson?.phone || '';
        const country = dataJson?.country || dataJson?.nationality || '';
        const statusConfig = getStatusConfig(submission.status);
        const StatusIcon = statusConfig.icon;
        
        // Get selfie for avatar
        const avatarUrl = dataJson?.selfie_url || dataJson?.documents?.selfie || '';
        
        return (
          <Card
            key={submission.id}
            onClick={() => onSelect(submission)}
            className={cn(
              'p-4 cursor-pointer transition-all duration-200 hover:shadow-md border-l-4',
              selectedId === submission.id
                ? 'bg-accent/50 border-l-primary shadow-md ring-1 ring-primary/20'
                : 'border-l-transparent hover:border-l-primary/30 hover:bg-accent/20'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <Avatar className="h-12 w-12 border-2 border-border shrink-0">
                <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
                <AvatarFallback className="bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate text-foreground">{fullName}</h3>
                    <p className="text-sm text-muted-foreground truncate">{email}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs shrink-0 flex items-center gap-1', statusConfig.color)}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {statusConfig.label}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-2">
                  {phone && (
                    <span className="flex items-center gap-1">
                      📱 {phone}
                    </span>
                  )}
                  {country && (
                    <span className="flex items-center gap-1">
                      🌍 {country}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                  <span>
                    {submission.submitted_at
                      ? `Submitted ${format(new Date(submission.submitted_at), 'MMM d, yyyy')}`
                      : 'Not submitted'}
                  </span>
                  {submission.reviewed_at && (
                    <span className="text-[10px] opacity-70">
                      Reviewed {format(new Date(submission.reviewed_at), 'MMM d')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
