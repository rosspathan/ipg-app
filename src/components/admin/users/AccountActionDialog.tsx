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
import { AlertTriangle, Ban, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AccountActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  action: "suspend" | "ban";
  onSuccess?: () => void;
}

export function AccountActionDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  action,
  onSuccess,
}: AccountActionDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const actionConfig = {
    suspend: {
      title: "Suspend User Account",
      confirmWord: "SUSPEND",
      status: "suspended",
      icon: Lock,
      description: "This will temporarily disable the user's access to the platform.",
    },
    ban: {
      title: "Ban User Account",
      confirmWord: "BAN",
      status: "banned",
      icon: Ban,
      description: "This will permanently ban the user from accessing the platform.",
    },
  };

  const config = actionConfig[action];

  const handleAction = async () => {
    if (confirmText !== config.confirmWord) {
      toast({
        title: "Invalid Confirmation",
        description: `Please type ${config.confirmWord} to confirm`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ account_status: config.status })
        .eq("user_id", userId);

      if (error) throw error;

      toast({
        title: `User ${action === "suspend" ? "Suspended" : "Banned"}`,
        description: `Successfully ${action === "suspend" ? "suspended" : "banned"} ${userEmail}`,
      });

      onOpenChange(false);
      setConfirmText("");
      onSuccess?.();
    } catch (error: any) {
      console.error(`Error ${action}ing user:`, error);
      toast({
        title: "Action Failed",
        description: error.message || `Failed to ${action} user. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isProcessing) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setConfirmText("");
      }
    }
  };

  const Icon = config.icon;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Icon className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">{config.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are about to {action} <strong>{userEmail}</strong>
            </p>
            <p>{config.description}</p>
            <p className="text-destructive font-semibold">
              {action === "ban" ? "This action is permanent." : "You can reactivate this account later."}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirmText">
              Type <span className="font-mono font-bold">{config.confirmWord}</span> to confirm
            </Label>
            <Input
              id="confirmText"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={config.confirmWord}
              className="font-mono"
              disabled={isProcessing}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleAction}
            disabled={isProcessing || confirmText !== config.confirmWord}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Icon className="w-4 h-4 mr-2" />
                {config.confirmWord}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
