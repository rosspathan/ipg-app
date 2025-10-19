import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';

interface AgeVerificationModalProps {
  open: boolean;
  onVerify: () => void;
  onDecline: () => void;
}

export const AgeVerificationModal = ({ open, onVerify, onDecline }: AgeVerificationModalProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleVerify = () => {
    if (confirmed) {
      onVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onDecline()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-primary" />
            <DialogTitle>Age Verification Required</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-4 mt-4">
            <p>
              To comply with legal requirements and protect minors, you must be at least 18
              years old to use this platform.
            </p>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm">
                By proceeding, you confirm that:
              </p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>You are at least 18 years old</li>
                <li>You have the legal capacity to enter into binding agreements</li>
                <li>You are not prohibited from using this service in your jurisdiction</li>
              </ul>
            </div>

            <div className="flex items-start gap-2 mt-4">
              <Checkbox
                id="age-confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <label
                htmlFor="age-confirm"
                className="text-sm cursor-pointer leading-tight"
              >
                I confirm that I am at least 18 years old and have the legal capacity to use
                this platform.
              </label>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDecline}>
            I'm Under 18
          </Button>
          <Button
            onClick={handleVerify}
            disabled={!confirmed}
            className="bg-primary hover:bg-primary/90"
          >
            Verify & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
