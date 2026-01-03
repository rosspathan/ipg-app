import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Shield, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import * as bip39 from "bip39";
import { ethers } from "ethers";
import { storeWallet, setWalletStorageUserId } from "@/utils/walletStorage";
import { useEncryptedWalletBackup } from "@/hooks/useEncryptedWalletBackup";
import PinEntryDialog from "@/components/profile/PinEntryDialog";
import { supabase } from "@/integrations/supabase/client";

const ImportWalletBackup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { createBackup } = useEncryptedWalletBackup();
  
  const [seedPhrase, setSeedPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [importedWallet, setImportedWallet] = useState<{ address: string; seedPhrase: string } | null>(null);

  const handlePhraseChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSeedPhrase(e.target.value);
    setError("");
  };

  // SECURITY: Blocked test mnemonics
  const BLOCKED_MNEMONICS = [
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    "legal winner thank year wave sausage worth useful legal winner thank yellow",
    "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong"
  ];

  const handleImport = async () => {
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
      setError("This is a publicly known test phrase and cannot be used. Please use your own unique recovery phrase.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Derive wallet from seed phrase
      const hdNode = ethers.HDNodeWallet.fromPhrase(normalizedPhrase);
      const walletAddress = hdNode.address;

      // SECURITY: Check if this wallet is already linked to another user
      const { data: existingWallet } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('wallet_address', walletAddress)
        .neq('user_id', user.id)
        .maybeSingle();

      if (existingWallet) {
        setError("This wallet is already linked to another account. Please use your own unique recovery phrase.");
        setLoading(false);
        return;
      }

      // Store locally
      setWalletStorageUserId(user.id);
      storeWallet({
        address: walletAddress,
        seedPhrase: normalizedPhrase,
        privateKey: hdNode.privateKey,
        network: 'mainnet'
      }, user.id);

      // Update profile with wallet address (use user_id, not id)
      await supabase
        .from('profiles')
        .update({ 
          wallet_address: walletAddress,
          setup_complete: true 
        })
        .eq('user_id', user.id);

      // Store for PIN dialog
      setImportedWallet({
        address: walletAddress,
        seedPhrase: normalizedPhrase
      });

      // Show PIN dialog to create backup
      setShowPinDialog(true);
    } catch (err) {
      console.error("Import error:", err);
      setError("Failed to import wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = async (pin: string): Promise<boolean> => {
    if (!importedWallet) return false;

    const success = await createBackup(
      importedWallet.seedPhrase,
      importedWallet.address,
      pin
    );

    if (success) {
      toast({
        title: "Wallet Imported & Backed Up",
        description: "Your recovery phrase is now securely stored.",
      });
      navigate("/profile/security");
    } else {
      toast({
        title: "Backup Failed",
        description: "Wallet imported but backup failed. You can try again from Security settings.",
        variant: "destructive"
      });
      navigate("/profile/security");
    }

    return success;
  };

  const handleSkipBackup = () => {
    toast({
      title: "Wallet Imported",
      description: "Your wallet was imported. You can backup later from Security settings.",
    });
    navigate("/profile/security");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile/security")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Re-import Wallet</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="p-6 max-w-md mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Info Card */}
          <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground mb-1">
                  Restore Your Wallet Backup
                </p>
                <p className="text-muted-foreground">
                  Enter your 12 or 24 word recovery phrase. After import, you'll encrypt it with your PIN for secure cloud backup.
                </p>
              </div>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Recovery Phrase</label>
            <Textarea
              placeholder="Enter your 12 or 24 word recovery phrase..."
              value={seedPhrase}
              onChange={handlePhraseChange}
              className="min-h-[120px] resize-none font-mono text-sm"
              disabled={loading}
            />
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {/* Security Tips */}
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>Your phrase is encrypted locally before upload</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>Only you can decrypt it with your PIN</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span>Access your wallet from any device</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleImport}
            disabled={loading || !seedPhrase.trim()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import & Create Backup"
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/profile/security")}
            className="w-full"
          >
            Cancel
          </Button>
        </motion.div>
      </div>

      {/* PIN Dialog */}
      <PinEntryDialog
        open={showPinDialog}
        onOpenChange={(open) => {
          if (!open) handleSkipBackup();
          setShowPinDialog(open);
        }}
        onSubmit={handlePinSubmit}
        title="Enter PIN to Encrypt Backup"
        description="Your recovery phrase will be encrypted with your PIN before being stored securely."
        isNewPin={false}
      />
    </div>
  );
};

export default ImportWalletBackup;