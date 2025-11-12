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
        return 'default';
      case 'approved':
        return 'outline';
      case 'rejected':
        return 'destructive';
      case 'needs_info':
        return 'secondary';
      case 'draft':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'pending':
        return 'Pending Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'needs_info':
        return 'Needs Info';
      case 'draft':
        return 'Draft';
      default:
        return status;
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
    <div className="space-y-3">
      {submissions.map((submission) => {
        const dataJson = submission.data_json as any;
        const fullName = submission.full_name_computed || dataJson?.full_name || 'Unknown User';
        const email = submission.profiles?.email || submission.email_computed || dataJson?.email;
        const phone = submission.phone_computed || dataJson?.phone;
        const selfieUrl = dataJson?.selfie_url || dataJson?.documents?.selfie;
        
        return (
          <Card
            key={submission.id}
            className={cn(
              'p-4 cursor-pointer hover:border-primary/50',
              selectedId === submission.id && 'border-primary bg-accent/30'
            )}
            onClick={() => onSelect(submission)}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <Avatar className="h-12 w-12 border-2 border-border">
                <AvatarImage src={selfieUrl} alt={fullName} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              
              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-base truncate">{fullName}</h4>
                  <Badge variant={getStatusColor(submission.status)} className="shrink-0">
                    {getStatusLabel(submission.status)}
                  </Badge>
                </div>
                
                {email && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}
                
                {phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{phone}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>
                    {submission.submitted_at
                      ? `Submitted ${format(new Date(submission.submitted_at), 'MMM dd, yyyy HH:mm')}`
                      : 'Not submitted yet'}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
