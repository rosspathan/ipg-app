import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RejectModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function RejectModal({ open, onClose, onConfirm, loading }: RejectModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject KYC Submission</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this submission. This will be visible to the user.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2">
          <Label htmlFor="rejection-reason">Rejection Reason *</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for rejection..."
            className="min-h-[120px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
          >
            Reject Submission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
