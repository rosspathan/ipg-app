import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KYCSubmissionWithUser } from '@/hooks/useAdminKYC';
import { cn } from '@/lib/utils';
import { User, FileText, ScanFace, Smartphone, Eye, Edit3 } from 'lucide-react';
import {
  computeOverallKYCStatus,
  OVERALL_STATUS_UI,
  pillarLabel,
} from '@/lib/kyc/overallStatus';

interface KYCSubmissionListProps {
  submissions: KYCSubmissionWithUser[];
  selectedId?: string;
  onSelect: (submission: KYCSubmissionWithUser) => void;
}

export function KYCSubmissionList({ submissions, selectedId, onSelect }: KYCSubmissionListProps) {
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
        const overall = computeOverallKYCStatus(submission);
        const overallUI = OVERALL_STATUS_UI[overall];

        const docsUI = pillarLabel(submission.documents_status);
        const faceUI = pillarLabel(submission.face_status);
        const mobileUI = pillarLabel(submission.mobile_status);

        const avatarUrl = dataJson?.selfie_url || dataJson?.documents?.selfie || '';
        const lastUpdated = submission.updated_at || submission.submitted_at;
        const actionLabel =
          overall === 'fully_approved' ? 'View'
          : overall === 'rejected' ? 'View'
          : 'Review';
        const ActionIcon = actionLabel === 'View' ? Eye : Edit3;

        return (
          <Card
            key={submission.id}
            onClick={() => onSelect(submission)}
            className={cn(
              'p-4 cursor-pointer transition-all duration-200 hover:shadow-md border-l-4',
              selectedId === submission.id
                ? 'bg-accent/50 border-l-primary shadow-md ring-1 ring-primary/20'
                : `border-l-transparent hover:border-l-primary/30 hover:bg-accent/20`
            )}
          >
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 border-2 border-border shrink-0">
                <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
                <AvatarFallback className="bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                {/* Header: name + overall status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold truncate text-foreground">{fullName}</h3>
                    <p className="text-xs text-muted-foreground truncate">{email}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[11px] shrink-0 flex items-center gap-1.5 font-bold border',
                      overallUI.className,
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', overallUI.dotClassName)} />
                    {overallUI.label}
                  </Badge>
                </div>

                {/* Per-pillar chips */}
                <div className="grid grid-cols-3 gap-1.5 mb-2">
                  <PillarChip icon={FileText} label="Docs" status={docsUI} />
                  <PillarChip icon={ScanFace} label="Face" status={faceUI} />
                  <PillarChip icon={Smartphone} label="Mobile" status={mobileUI} />
                </div>

                {/* Footer: updated + action */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                  <span>
                    {lastUpdated
                      ? `Updated ${format(new Date(lastUpdated), 'MMM d, HH:mm')}`
                      : 'Not submitted'}
                  </span>
                  <Button
                    size="sm"
                    variant={overall === 'fully_approved' || overall === 'rejected' ? 'outline' : 'default'}
                    className="h-7 px-3 text-[11px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(submission);
                    }}
                  >
                    <ActionIcon className="h-3 w-3 mr-1" />
                    {actionLabel}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function PillarChip({
  icon: Icon,
  label,
  status,
}: {
  icon: any;
  label: string;
  status: { label: string; className: string };
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] leading-tight',
        status.className,
      )}
      title={`${label}: ${status.label}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <div className="flex flex-col min-w-0">
        <span className="font-semibold uppercase opacity-80">{label}</span>
        <span className="font-bold truncate">{status.label}</span>
      </div>
    </div>
  );
}
