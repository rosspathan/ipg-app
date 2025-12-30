import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { clearAllLocalWalletData } from "@/utils/walletStorage";

interface ResetLocalWalletButtonProps {
  userId?: string;
  onReset?: () => void;
}

export function ResetLocalWalletButton({ userId, onReset }: ResetLocalWalletButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleReset = () => {
    try {
      // Clear all local wallet data (user-scoped, legacy, and pending)
      clearAllLocalWalletData(userId);
      
      toast({
        title: "Local Wallet Data Cleared",
        description: "All wallet data on this device has been removed. You'll need to re-import your wallet to see your recovery phrase.",
      });
      
      setOpen(false);
      onReset?.();
    } catch (error) {
      console.error("Failed to reset local wallet data:", error);
      toast({
        title: "Error",
        description: "Failed to clear local wallet data",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Reset Local Wallet Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Local Wallet Data?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will remove all wallet data stored on this device, including:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 mt-2">
              <li>Your recovery phrase (from this device only)</li>
              <li>Private keys stored locally</li>
              <li>Any pending wallet imports</li>
            </ul>
            <p className="mt-3 font-medium text-foreground">
              Your actual wallet and funds are NOT affected. You can re-import your wallet anytime using your recovery phrase.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Reset Data
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}