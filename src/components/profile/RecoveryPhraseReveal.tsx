import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  Copy, 
  Download, 
  Eye, 
  EyeOff,
  CheckCircle,
  Cloud,
  Loader2,
  Lock,
  KeyRound,
  Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { getStoredWallet, storeWallet, setWalletStorageUserId } from "@/utils/walletStorage";
import AddRecoveryPhraseDialog from "./AddRecoveryPhraseDialog";
import { supabase } from "@/integrations/supabase/client";
import { useEncryptedWalletBackup } from "@/hooks/useEncryptedWalletBackup";

interface RecoveryPhraseRevealProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "warning" | "pin_entry" | "reveal" | "not_found";

const AUTO_HIDE_SECONDS = 30;

const RecoveryPhraseReveal = ({ open, onOpenChange }: RecoveryPhraseRevealProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkBackupExists, retrieveBackup } = useEncryptedWalletBackup();
  const [step, setStep] = useState<Step>("warning");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_HIDE_SECONDS);
  const [copied, setCopied] = useState(false);
  const [pin, setPin] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");
  const [hasServerBackup, setHasServerBackup] = useState(false);
  const [showAddPhraseDialog, setShowAddPhraseDialog] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("warning");
      setSeedPhrase([]);
      setRevealed(false);
      setCountdown(AUTO_HIDE_SECONDS);
      setCopied(false);
      setPin("");
      setPinError("");
      setHasServerBackup(false);
    }
  }, [open]);

  // Auto-hide countdown
  useEffect(() => {
    if (step !== "reveal" || !revealed) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRevealed(false);
          return AUTO_HIDE_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, revealed]);

  const loadSeedPhrase = useCallback(async () => {
    try {
      // SECURITY: Only load from user-scoped storage for logged-in users
      let userId = user?.id;
      
      if (!userId) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        userId = currentUser?.id;
      }
      
      if (!userId) {
        toast({
          title: "Not Logged In",
          description: "Please log in to view your recovery phrase.",
          variant: "destructive"
        });
        onOpenChange(false);
        return false;
      }
      
      // First try local storage
      const userScopedWallet = getStoredWallet(userId);
      
      if (userScopedWallet?.seedPhrase) {
        const phrase = userScopedWallet.seedPhrase;
        const words = phrase.trim().split(/\s+/);
        console.log('[RECOVERY] Loaded phrase from local storage for wallet:', userScopedWallet.address?.slice(0, 10) + '...');
        setSeedPhrase(words);
        return true;
      }

      // Check if server backup exists
      const backupStatus = await checkBackupExists(userId);
      
      if (backupStatus.exists) {
        console.log('[RECOVERY] No local phrase, but server backup exists');
        setHasServerBackup(true);
        setStep("pin_entry");
        return false; // Will continue after PIN entry
      }

      // No local and no server backup
      console.log('[RECOVERY] No seed phrase found for user:', userId.slice(0, 8) + '...');
      setStep("not_found");
      return false;
    } catch (error) {
      console.error("Failed to load seed phrase:", error);
      toast({
        title: "Error",
        description: "Failed to load recovery phrase",
        variant: "destructive"
      });
      onOpenChange(false);
      return false;
    }
  }, [onOpenChange, toast, user?.id, checkBackupExists]);

  const handlePinSubmit = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPinError("PIN must be 6 digits");
      return;
    }

    setPinLoading(true);
    setPinError("");

    try {
      const phrase = await retrieveBackup(pin);
      
      if (phrase) {
        const words = phrase.trim().split(/\s+/);
        setSeedPhrase(words);
        
        // Re-store locally for future access
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_address')
            .eq('user_id', currentUser.id)
            .single();
          
          if (profile?.wallet_address) {
            setWalletStorageUserId(currentUser.id);
            storeWallet({
              address: profile.wallet_address,
              privateKey: '', // Not available from server backup
              seedPhrase: phrase,
              network: 'mainnet',
              balance: '0'
            }, currentUser.id);
            console.log('[RECOVERY] Re-stored wallet locally from server backup');
          }
        }
        
        setStep("reveal");
      } else {
        setPinError("Invalid PIN or decryption failed");
      }
    } catch (error) {
      setPinError("Failed to decrypt backup");
    } finally {
      setPinLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(seedPhrase.join(" "));
      setCopied(true);
      toast({
        title: "Copied",
        description: "Recovery phrase copied to clipboard"
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the words",
        variant: "destructive"
      });
    }
  };

  const handleDownload = () => {
    const content = `IPG i-SMART Recovery Phrase
================================
Keep this file safe and never share it with anyone!

Your 12-word recovery phrase:
${seedPhrase.map((word, i) => `${i + 1}. ${word}`).join("\n")}

================================
WARNING: Anyone with this phrase can access your funds.
Store this in a secure location and delete this file after backing up.
Generated: ${new Date().toISOString()}
`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ipg-recovery-phrase-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Recovery phrase saved. Store it securely!"
    });
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "warning" && (
          <>
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <DialogTitle className="text-center">
                Backup Recovery Phrase
              </DialogTitle>
              <DialogDescription className="text-center">
                Your recovery phrase is the only way to restore your wallet if you lose access to this device.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Never share your recovery phrase!</strong>
                <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
                  <li>Anyone with this phrase can steal your funds</li>
                  <li>IPG support will never ask for your phrase</li>
                  <li>Store it in a secure, offline location</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex gap-3 mt-6">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1"
                onClick={async () => {
                  if (await loadSeedPhrase()) {
                    setStep("reveal");
                  }
                }}
              >
                I Understand
              </Button>
            </div>
          </>
        )}

        {step === "pin_entry" && (
          <>
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Cloud className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">
                Cloud Backup Found
              </DialogTitle>
              <DialogDescription className="text-center">
                Your wallet is backed up securely. Enter your PIN to decrypt it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Backup PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setPinError("");
                  }}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>

              {pinError && (
                <p className="text-sm text-destructive text-center">{pinError}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={pinLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePinSubmit}
                  disabled={pinLoading || pin.length !== 6}
                >
                  {pinLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Decrypt
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "not_found" && (
          <>
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
                <KeyRound className="h-6 w-6 text-amber-500" />
              </div>
              <DialogTitle className="text-center">
                Recovery Phrase Not Available
              </DialogTitle>
              <DialogDescription className="text-center">
                Your seed phrase is not stored on this device and no cloud backup was found.
              </DialogDescription>
            </DialogHeader>

            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  For your safety, i-SMART does not store your recovery phrase unless you create an encrypted cloud backup.
                </p>
              </AlertDescription>
            </Alert>

            <div className="space-y-3 mt-6">
              <Button 
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  setShowAddPhraseDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Recovery Phrase
              </Button>
              
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/onboarding/wallet");
                }}
              >
                Create New Wallet
              </Button>

              <Button 
                variant="ghost"
                className="w-full"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {step === "reveal" && (
          <>
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <DialogTitle className="text-center">
                Your Recovery Phrase
              </DialogTitle>
              <DialogDescription className="text-center">
                Write down these {seedPhrase.length} words in order and store them safely
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 relative">
              {/* Word Grid */}
              <div 
                className={`grid grid-cols-3 gap-2 p-4 rounded-lg bg-muted/50 border transition-all duration-300 ${
                  !revealed ? "blur-md select-none" : ""
                }`}
              >
                {seedPhrase.map((word, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 bg-background rounded px-2 py-1.5 text-sm"
                  >
                    <span className="text-muted-foreground w-5 text-right font-mono text-xs">
                      {index + 1}.
                    </span>
                    <span className="font-medium">{word}</span>
                  </div>
                ))}
              </div>

              {/* Reveal Overlay */}
              {!revealed && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setRevealed(true);
                      setCountdown(AUTO_HIDE_SECONDS);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Tap to Reveal
                  </Button>
                </div>
              )}
            </div>

            {revealed && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Auto-hiding in {countdown} seconds
              </p>
            )}

            <div className="flex gap-3 mt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleCopy}
                disabled={!revealed}
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={handleDownload}
                disabled={!revealed}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>

            {revealed && (
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full mt-2"
                onClick={() => setRevealed(false)}
              >
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Phrase
              </Button>
            )}

            <Button 
              className="w-full mt-4"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Add Recovery Phrase Dialog */}
    <AddRecoveryPhraseDialog
      open={showAddPhraseDialog}
      onOpenChange={setShowAddPhraseDialog}
      onSuccess={() => {
        // Refresh the backup check if user opens reveal again
        setStep("warning");
      }}
    />
  </>
  );
};

export default RecoveryPhraseReveal;
