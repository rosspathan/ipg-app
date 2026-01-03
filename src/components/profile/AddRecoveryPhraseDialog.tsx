/**
 * AddRecoveryPhraseDialog - Allows users to add their recovery phrase from Security Center
 * 
 * Flow:
 * 1. User pastes 12/24-word phrase
 * 2. Validate with BIP39
 * 3. Derive wallet address
 * 4. Check if address matches profile (if set) or is unique
 * 5. Store locally
 * 6. Prompt for backup PIN
 * 7. Create encrypted cloud backup
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  KeyRound,
  Loader2,
  AlertCircle,
  CheckCircle,
  Lock,
  Shield
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import * as bip39 from "bip39";
import { ethers } from "ethers";
import { storeWallet, setWalletStorageUserId } from "@/utils/walletStorage";
import { useEncryptedWalletBackup } from "@/hooks/useEncryptedWalletBackup";
import { supabase } from "@/integrations/supabase/client";
import { SessionManager } from "@/services/SessionManager";

interface AddRecoveryPhraseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = "phrase_entry" | "pin_entry" | "success";

// SECURITY: Blocked test mnemonics
const BLOCKED_MNEMONICS = [
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
  "legal winner thank year wave sausage worth useful legal winner thank yellow",
  "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"
];

const AddRecoveryPhraseDialog = ({
  open,
  onOpenChange,
  onSuccess
}: AddRecoveryPhraseDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { createBackup } = useEncryptedWalletBackup();

  const [step, setStep] = useState<Step>("phrase_entry");
  const [seedPhrase, setSeedPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  
  // PIN entry state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");

  const resetState = () => {
    setStep("phrase_entry");
    setSeedPhrase("");
    setLoading(false);
    setError("");
    setWalletAddress("");
    setPin("");
    setConfirmPin("");
    setPinError("");
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handlePhraseSubmit = async () => {
    if (!user?.id) {
      setError("Please log in first");
      return;
    }

    const normalizedPhrase = seedPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
    const words = normalizedPhrase.split(' ');

    if (words.length !== 12 && words.length !== 24) {
      setError("Please enter a valid 12 or 24 word recovery phrase");
      return;
    }

    if (!bip39.validateMnemonic(normalizedPhrase)) {
      setError("Invalid recovery phrase. Please check your words and try again.");
      return;
    }

    // SECURITY: Block known test mnemonics
    if (BLOCKED_MNEMONICS.includes(normalizedPhrase)) {
      setError("This is a publicly known test phrase and cannot be used.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Derive wallet from seed phrase
      const hdNode = ethers.HDNodeWallet.fromPhrase(normalizedPhrase);
      const derivedAddress = hdNode.address;

      console.log('[ADD_PHRASE] Derived address:', derivedAddress.slice(0, 10) + '...');

      // Get user's current profile wallet address
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_address')
        .eq('user_id', user.id)
        .single();

      // If profile has a wallet address, check if it matches
      if (profile?.wallet_address) {
        if (profile.wallet_address.toLowerCase() !== derivedAddress.toLowerCase()) {
          setError("This phrase doesn't match the wallet linked to your account. The derived address is different.");
          setLoading(false);
          return;
        }
      } else {
        // No wallet linked - check if address is unique
        const { data: existingWallet } = await supabase
          .from('profiles')
          .select('user_id')
          .ilike('wallet_address', derivedAddress)
          .neq('user_id', user.id)
          .maybeSingle();

        if (existingWallet) {
          setError("This wallet is already linked to another account.");
          setLoading(false);
          return;
        }
      }

      // Store locally
      setWalletStorageUserId(user.id);
      storeWallet({
        address: derivedAddress,
        seedPhrase: normalizedPhrase,
        privateKey: hdNode.privateKey,
        network: 'mainnet'
      }, user.id);

      // Update profile if no wallet was linked
      if (!profile?.wallet_address) {
        await supabase
          .from('profiles')
          .update({ 
            wallet_address: derivedAddress,
            setup_complete: true 
          })
          .eq('user_id', user.id);
      }

      setWalletAddress(derivedAddress);
      setStep("pin_entry");
      
      console.log('[ADD_PHRASE] Phrase validated and stored locally');
    } catch (err) {
      console.error("[ADD_PHRASE] Error:", err);
      setError("Failed to process recovery phrase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setPinError("PIN must be 6 digits");
      return;
    }

    if (pin !== confirmPin) {
      setPinError("PINs do not match");
      return;
    }

    setLoading(true);
    setPinError("");

    try {
      const normalizedPhrase = seedPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
      const success = await createBackup(normalizedPhrase, walletAddress, pin);

      if (success) {
        setStep("success");
        
        // Refresh session state
        await SessionManager.refresh();
        
        toast({
          title: "Recovery Phrase Added",
          description: "Your wallet is now backed up securely.",
        });
        
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 1500);
      } else {
        setPinError("Failed to create backup. Please try again.");
      }
    } catch (err) {
      console.error("[ADD_PHRASE] Backup error:", err);
      setPinError("An error occurred while creating backup.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        {step === "phrase_entry" && (
          <>
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <KeyRound className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">
                Add Recovery Phrase
              </DialogTitle>
              <DialogDescription className="text-center">
                Enter your 12 or 24 word recovery phrase to store it securely.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <Textarea
                placeholder="Enter your recovery phrase (12 or 24 words)..."
                value={seedPhrase}
                onChange={(e) => {
                  setSeedPhrase(e.target.value);
                  setError("");
                }}
                className="min-h-[100px] resize-none font-mono text-sm"
                disabled={loading}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Your phrase will be encrypted with your PIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>Only you can decrypt it</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePhraseSubmit}
                  disabled={loading || !seedPhrase.trim()}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Continue"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "pin_entry" && (
          <>
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-center">
                Create Backup PIN
              </DialogTitle>
              <DialogDescription className="text-center">
                Create a 6-digit PIN to encrypt your backup. You'll need this PIN to restore your wallet on other devices.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Create PIN</Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirmPin">Confirm PIN</Label>
                <Input
                  id="confirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setPinError("");
                  }}
                  className="text-center text-2xl tracking-widest"
                />
              </div>

              {pinError && (
                <p className="text-sm text-destructive text-center">{pinError}</p>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Remember this PIN!</strong> You'll need it to restore your wallet on other devices.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep("phrase_entry")}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePinSubmit}
                  disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Backup"
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <DialogTitle className="text-center">
                Backup Created!
              </DialogTitle>
              <DialogDescription className="text-center">
                Your recovery phrase is now securely backed up. You can restore it on any device using your PIN.
              </DialogDescription>
            </DialogHeader>

            <div className="text-center text-sm text-muted-foreground mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="font-mono">{walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddRecoveryPhraseDialog;
