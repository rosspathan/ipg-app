import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KYCSubmissionWithUser } from '@/hooks/useAdminKYC';
import { cn } from '@/lib/utils';

interface KYCSubmissionListProps {
  submissions: KYCSubmissionWithUser[];
  selectedId?: string;
  onSelect: (submission: KYCSubmissionWithUser) => void;
}

export function KYCSubmissionList({ submissions, selectedId, onSelect }: KYCSubmissionListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'approved':
        return 'outline';
      case 'rejected':
        return 'destructive';
      case 'needs_info':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No submissions found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((submission) => (
        <Card
          key={submission.id}
          className={cn(
            'p-4 cursor-pointer hover:bg-accent/50 transition-colors',
            selectedId === submission.id && 'bg-accent'
          )}
          onClick={() => onSelect(submission)}
        >
          <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {((submission.data_json as any)?.personal_details?.full_name) || 'Unknown User'}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {submission.profiles?.email}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {submission.submitted_at
                  ? format(new Date(submission.submitted_at), 'MMM dd, yyyy HH:mm')
                  : 'Not submitted'}
              </p>
            </div>
            <Badge variant={getStatusColor(submission.status)}>
              {submission.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
