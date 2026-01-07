import { useState } from 'react';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FixWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileWallet: string | null;
  backupWallet: string | null;
  onSuccess: () => void;
}

export function FixWalletDialog({
  open,
  onOpenChange,
  profileWallet,
  backupWallet,
  onSuccess
}: FixWalletDialogProps) {
  const [isFixing, setIsFixing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleFix = async () => {
    setIsFixing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to fix your wallet.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('fix-user-wallet', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setIsSuccess(true);
      toast({
        title: "Wallet Fixed",
        description: "Your wallet address has been synchronized successfully.",
      });

      // Dispatch event to refresh wallet data
      window.dispatchEvent(new CustomEvent('evm:address:updated', { 
        detail: { address: data.wallet_address } 
      }));

      // Call success callback after a brief delay to show success state
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
        setIsSuccess(false);
      }, 1500);

    } catch (error: any) {
      console.error('[FixWalletDialog] Error:', error);
      toast({
        title: "Fix Failed",
        description: error.message || "Failed to fix wallet. Please try again or contact support.",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  const formatAddress = (addr: string | null) => {
    if (!addr) return 'Not set';
    return `${addr.slice(0, 10)}...${addr.slice(-6)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isSuccess ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Wallet Fixed
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-warning" />
                Fix Wallet Mismatch
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isSuccess 
              ? "Your wallet addresses have been synchronized successfully."
              : "Your displayed wallet address doesn't match your seed phrase backup. This will update your profile to match your seed phrase."
            }
          </DialogDescription>
        </DialogHeader>

        {!isSuccess && (
          <div className="space-y-4 py-4">
            {/* Address comparison */}
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Current (incorrect)</p>
                <p className="font-mono text-foreground">{formatAddress(profileWallet)}</p>
              </div>
              
              <div className="flex justify-center">
                <span className="text-muted-foreground">↓</span>
              </div>
              
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Correct (from seed phrase)</p>
                <p className="font-mono text-foreground">{formatAddress(backupWallet)}</p>
              </div>
            </div>

            {/* Warning */}
            <p className="text-xs text-muted-foreground">
              This will update your profile wallet address to match your seed phrase backup. 
              Your funds and transaction history are not affected.
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isFixing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleFix}
                disabled={isFixing || !backupWallet}
              >
                {isFixing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Fixing...
                  </>
                ) : (
                  'Fix Now'
                )}
              </Button>
            </div>
          </div>
        )}

        {isSuccess && (
          <div className="py-4 text-center">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">New wallet address</p>
              <p className="font-mono text-foreground">{formatAddress(backupWallet)}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
