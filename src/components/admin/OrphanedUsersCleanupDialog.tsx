import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

interface OrphanedUsersCleanupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orphanedCount: number;
  onConfirm: (opts: { hardDelete: boolean }) => Promise<void>;
}

export function OrphanedUsersCleanupDialog({
  open,
  onOpenChange,
  orphanedCount,
  onConfirm
}: OrphanedUsersCleanupDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hardDelete, setHardDelete] = useState(false);

  const handleConfirm = async () => {
    if (confirmText !== "CLEANUP") return;
    
    try {
      setLoading(true);
      await onConfirm({ hardDelete });
      onOpenChange(false);
      setConfirmText("");
      setHardDelete(false);
    } catch (error) {
      console.error("Cleanup failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      setConfirmText("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirm Cleanup
          </DialogTitle>
          <DialogDescription>
            This action will permanently delete {orphanedCount} orphaned user{orphanedCount !== 1 ? 's' : ''} from the authentication system.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This action cannot be undone. Users will be removed from auth.users and can then re-register with their email addresses.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm">
              Type <span className="font-mono font-bold">CLEANUP</span> to confirm
            </Label>
            <Input
              id="confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type CLEANUP"
              disabled={loading}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>What will happen:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>{orphanedCount} user{orphanedCount !== 1 ? 's' : ''} will be deleted from auth.users</li>
              <li>These email addresses can be used to create new accounts</li>
              <li>Admin emails are protected and will be skipped</li>
              <li>Action will be logged for audit</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Checkbox id="hard-delete" checked={hardDelete} onCheckedChange={(v) => setHardDelete(Boolean(v))} />
            <Label htmlFor="hard-delete" className="text-sm">Force hard delete (use if soft delete fails)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== "CLEANUP" || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cleaning...
              </>
            ) : (
              "Delete Orphaned Users"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
