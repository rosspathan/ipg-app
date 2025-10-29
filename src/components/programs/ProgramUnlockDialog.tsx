import { Check, Lock, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface ProgramUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programName: string;
  lockReasons: string[];
}

export function ProgramUnlockDialog({
  open,
  onOpenChange,
  programName,
  lockReasons,
}: ProgramUnlockDialogProps) {
  const navigate = useNavigate();

  const getActionForReason = (reason: string) => {
    if (reason.toLowerCase().includes('kyc')) {
      return {
        label: 'Complete KYC',
        action: () => {
          onOpenChange(false);
          navigate('/kyc');
        },
      };
    }
    if (reason.toLowerCase().includes('badge') || reason.toLowerCase().includes('unlock')) {
      return {
        label: 'Unlock Badge',
        action: () => {
          onOpenChange(false);
          navigate('/app/programs/badge-subscription');
        },
      };
    }
    if (reason.toLowerCase().includes('balance')) {
      return {
        label: 'Top Up BSK',
        action: () => {
          onOpenChange(false);
          navigate('/wallet');
        },
      };
    }
    if (reason.toLowerCase().includes('region')) {
      return null; // Can't change region
    }
    return {
      label: 'Learn More',
      action: () => onOpenChange(false),
    };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <DialogTitle className="text-center">Unlock {programName}</DialogTitle>
          <DialogDescription className="text-center">
            Complete the following requirements to access this program
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {lockReasons.map((reason, index) => {
            const action = getActionForReason(reason);
            return (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Check className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{reason}</p>
                </div>
                {action && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={action.action}
                    className="gap-1"
                  >
                    {action.label}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg bg-muted p-4">
          <p className="text-xs text-muted-foreground text-center">
            💡 Tip: Complete requirements to unlock exclusive rewards and features
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
