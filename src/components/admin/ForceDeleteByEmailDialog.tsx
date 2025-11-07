import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ForceDeleteByEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (params: { emails: string[]; hardDelete: boolean; dryRun: boolean }) => Promise<void> | void;
}

export function ForceDeleteByEmailDialog({ open, onOpenChange, onConfirm }: ForceDeleteByEmailDialogProps) {
  const [emailsText, setEmailsText] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [hardDelete, setHardDelete] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emails = useMemo(() => {
    return Array.from(new Set(
      emailsText
        .split(/\r?\n|,|;|\s+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0)
    ));
  }, [emailsText]);

  const canConfirm = confirmText === "FORCE DELETE" && emails.length > 0 && !submitting;

  const handleClose = () => {
    if (submitting) return;
    onOpenChange(false);
    setTimeout(() => {
      setEmailsText("");
      setConfirmText("");
      setHardDelete(true);
      setDryRun(false);
    }, 150);
  };

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      await onConfirm({ emails, hardDelete, dryRun });
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Force Delete Users by Email</DialogTitle>
          <DialogDescription>
            Paste one or more email addresses. This will remove profiles and attempt a hard delete. If deletion fails, we neutralize the auth record to free the email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="emails">Emails (one per line)</Label>
            <Textarea id="emails" placeholder="user1@example.com\nuser2@example.com" value={emailsText} onChange={(e) => setEmailsText(e.target.value)} rows={8} />
            <p className="text-sm text-muted-foreground">Parsed {emails.length} email{emails.length === 1 ? "" : "s"}.</p>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="hard-delete" checked={hardDelete} onCheckedChange={(v) => setHardDelete(Boolean(v))} />
            <Label htmlFor="hard-delete">Force hard delete (disable soft delete)</Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="dry-run" checked={dryRun} onCheckedChange={(v) => setDryRun(Boolean(v))} />
            <Label htmlFor="dry-run">Dry run (preview only)</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Type "FORCE DELETE" to confirm</Label>
            <input
              id="confirm"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="FORCE DELETE"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!canConfirm}>
            {submitting ? "Deleting..." : "Force Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
