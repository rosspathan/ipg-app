import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAuthUser } from '@/hooks/useAuthUser';
import { useWeb3 } from '@/contexts/Web3Context';

interface SessionConflictModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionEmail: string;
  walletAddress: string;
}

export function SessionConflictModal({
  open,
  onOpenChange,
  sessionEmail,
  walletAddress
}: SessionConflictModalProps) {
  const { signOut } = useAuthUser();
  const { disconnectWallet } = useWeb3();

  const handleSwitchAccount = async () => {
    await signOut();
    onOpenChange(false);
    // Navigate to login or show appropriate screen
    window.location.href = '/onboarding';
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Account Mismatch Detected</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              The wallet you connected (<span className="font-mono text-xs">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</span>) 
              belongs to a different account than the one you're currently logged in as (<span className="font-semibold">{sessionEmail}</span>).
            </p>
            <p className="text-destructive font-medium">
              Choose an option to continue:
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            onClick={handleSwitchAccount}
            variant="default"
            className="w-full"
          >
            Sign Out & Switch to Wallet's Account
          </Button>
          <Button 
            onClick={handleDisconnectWallet}
            variant="outline"
            className="w-full"
          >
            Keep Current Account & Disconnect Wallet
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
            variant="ghost"
            className="w-full text-muted-foreground"
          >
            Dismiss (I'll handle this later)
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
