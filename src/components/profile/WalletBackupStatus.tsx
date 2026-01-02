import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Cloud, 
  Loader2,
  Shield,
  Download
} from "lucide-react";
import { useEncryptedWalletBackup } from "@/hooks/useEncryptedWalletBackup";
import { useAuth } from "@/hooks/useAuth";
import { getStoredWallet } from "@/utils/walletStorage";
import PinEntryDialog from "./PinEntryDialog";
import { useToast } from "@/hooks/use-toast";

type BackupState = "loading" | "backed_up" | "local_only" | "not_available";

const WalletBackupStatus = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { backupStatus, checkBackupExists, createBackup } = useEncryptedWalletBackup();
  const [backupState, setBackupState] = useState<BackupState>("loading");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [localWallet, setLocalWallet] = useState<{ address: string; seedPhrase: string } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.id) {
        setBackupState("loading");
        return;
      }

      // Check server backup
      const serverStatus = await checkBackupExists(user.id);
      
      // Check local wallet
      const wallet = getStoredWallet(user.id);
      
      if (serverStatus.exists) {
        setBackupState("backed_up");
      } else if (wallet?.seedPhrase) {
        setBackupState("local_only");
        setLocalWallet({
          address: wallet.address || '',
          seedPhrase: wallet.seedPhrase
        });
      } else {
        setBackupState("not_available");
      }
    };

    checkStatus();
  }, [user?.id, checkBackupExists]);

  const handleBackupToCloud = async (pin: string): Promise<boolean> => {
    if (!localWallet?.seedPhrase || !localWallet?.address) {
      toast({
        title: "No Wallet Found",
        description: "No local wallet data to backup.",
        variant: "destructive"
      });
      return false;
    }

    const success = await createBackup(
      localWallet.seedPhrase,
      localWallet.address,
      pin
    );

    if (success) {
      setBackupState("backed_up");
      toast({
        title: "Backup Complete",
        description: "Your wallet is now securely backed up.",
      });
    }

    return success;
  };

  const handleReimportWallet = () => {
    navigate("/auth/import-wallet-backup");
  };

  const getStatusDisplay = () => {
    switch (backupState) {
      case "loading":
        return {
          icon: <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />,
          title: "Checking backup status...",
          description: "",
          color: "text-muted-foreground",
          bgColor: "bg-muted/50"
        };
      case "backed_up":
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: "Securely Backed Up",
          description: "Your wallet can be accessed from any device",
          color: "text-green-500",
          bgColor: "bg-green-500/10"
        };
      case "local_only":
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          title: "Local Only",
          description: "Backup to access from other devices",
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10"
        };
      case "not_available":
        return {
          icon: <XCircle className="h-5 w-5 text-destructive" />,
          title: "Not Available",
          description: "Re-import your wallet to create a backup",
          color: "text-destructive",
          bgColor: "bg-destructive/10"
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${status.bgColor}`}>
              {status.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Wallet Backup</span>
              </div>
              <p className={`text-sm font-semibold ${status.color}`}>
                {status.title}
              </p>
              {status.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {status.description}
                </p>
              )}
            </div>
            {backupState === "local_only" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPinDialog(true)}
                className="shrink-0"
              >
                <Cloud className="h-4 w-4 mr-1" />
                Backup
              </Button>
            )}
            {backupState === "not_available" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReimportWallet}
                className="shrink-0"
              >
                <Download className="h-4 w-4 mr-1" />
                Re-import
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <PinEntryDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onSubmit={handleBackupToCloud}
        title="Create Backup PIN"
        description="This PIN will encrypt your wallet. You'll need it to restore on another device."
        isNewPin={true}
      />
    </>
  );
};

export default WalletBackupStatus;
