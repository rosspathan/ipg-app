import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ForceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  isAdmin?: boolean;
  onSuccess?: () => void;
}

export function ForceDeleteDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  isAdmin = false,
  onSuccess,
}: ForceDeleteDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [confirmForce, setConfirmForce] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast({
        title: "Invalid Confirmation",
        description: "Please type DELETE to confirm",
        variant: "destructive",
      });
      return;
    }

    if (isAdmin && !confirmForce) {
      toast({
        title: "Admin Protection",
        description: "Check the confirmation box to delete an admin user",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: {
          user_id: userId,
          confirm: 'DELETE',
          confirmForce: confirmForce,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete user');
      }

      toast({
        title: "User Deleted",
        description: `Successfully deleted user ${userEmail} and all associated data`,
      });

      // Close dialog and reset state
      onOpenChange(false);
      setConfirmText("");
      setConfirmForce(false);

      // Call success callback
      onSuccess?.();

    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setConfirmText("");
        setConfirmForce(false);
      }
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">Force Delete User</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are about to permanently delete <strong>{userEmail}</strong> and all associated data:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>User profile and authentication</li>
              <li>All wallet balances and transactions</li>
              <li>KYC records and submissions</li>
              <li>Referral relationships and rewards</li>
              <li>Order and trade history</li>
              <li>All program participations</li>
            </ul>
            <p className="text-destructive font-semibold">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {isAdmin && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    This user has admin privileges
                  </p>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="confirmForce"
                      checked={confirmForce}
                      onCheckedChange={(checked) => setConfirmForce(checked as boolean)}
                    />
                    <Label
                      htmlFor="confirmForce"
                      className="text-sm font-normal cursor-pointer"
                    >
                      I understand and want to delete this admin user
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="confirmText">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              disabled={isDeleting}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== "DELETE" || (isAdmin && !confirmForce)}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
