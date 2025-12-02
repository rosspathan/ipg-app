import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KYCSubmissionWithUser } from '@/hooks/useAdminKYC';
import { cn } from '@/lib/utils';
import { User, Phone, Mail, Calendar } from 'lucide-react';

interface KYCSubmissionListProps {
  submissions: KYCSubmissionWithUser[];
  selectedId?: string;
  onSelect: (submission: KYCSubmissionWithUser) => void;
}

export function KYCSubmissionList({ submissions, selectedId, onSelect }: KYCSubmissionListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'approved':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'rejected':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'needs_info':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'needs_info':
        return 'Needs Info';
      default:
        return status;
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No submissions found
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {submissions.map((submission) => {
        const dataJson = submission.data_json as any;
        const fullName = submission.full_name_computed || dataJson?.full_name || 'Unknown User';
        const email = submission.profiles?.email || submission.email_computed || dataJson?.email || '';
        const phone = submission.phone_computed || dataJson?.phone || '';
        
        // Get avatar from selfie or profile
        const avatarUrl = (submission.profiles && 'avatar_url' in submission.profiles) 
          ? submission.profiles.avatar_url 
          : dataJson?.selfie_url || dataJson?.documents?.selfie;
        
        return (
          <Card
            key={submission.id}
            onClick={() => onSelect(submission)}
            className={cn(
              'p-4 cursor-pointer transition-all hover:shadow-md border-l-4',
              selectedId === submission.id
                ? 'bg-accent/50 border-l-primary shadow-md'
                : 'border-l-transparent hover:border-l-primary/30'
            )}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <Avatar className="h-12 w-12 border-2 border-border">
                <AvatarImage src={avatarUrl || ''} alt={fullName} />
                <AvatarFallback className="bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate">{fullName}</h3>
                    <p className="text-sm text-muted-foreground truncate">{email}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn('text-xs shrink-0', getStatusColor(submission.status))}
                  >
                    {getStatusLabel(submission.status)}
                  </Badge>
                </div>

                {phone && (
                  <p className="text-xs text-muted-foreground mb-2">📱 {phone}</p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {submission.submitted_at
                      ? format(new Date(submission.submitted_at), 'MMM d, yyyy')
                      : 'Not submitted'}
                  </span>
                  {submission.reviewed_at && (
                    <span className="text-[10px]">
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
