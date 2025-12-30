import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Copy, 
  Download, 
  Eye, 
  EyeOff,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RecoveryPhraseRevealProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "warning" | "reveal";

const AUTO_HIDE_SECONDS = 30;

const RecoveryPhraseReveal = ({ open, onOpenChange }: RecoveryPhraseRevealProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("warning");
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(AUTO_HIDE_SECONDS);
  const [copied, setCopied] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("warning");
      setSeedPhrase([]);
      setRevealed(false);
      setCountdown(AUTO_HIDE_SECONDS);
      setCopied(false);
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

  const loadSeedPhrase = useCallback(() => {
    try {
      // Check multiple localStorage keys for wallet data
      const storageKeys = [
        "cryptoflow_wallet",
        "pending_wallet_import",
        "ipg_wallet_data"
      ];

      let phrase: string | null = null;

      for (const key of storageKeys) {
        const data = localStorage.getItem(key);
        if (!data) continue;

        try {
          // ipg_wallet_data may be base64 encoded
          let parsed;
          if (key === "ipg_wallet_data") {
            try {
              parsed = JSON.parse(atob(data));
            } catch {
              parsed = JSON.parse(data);
            }
          } else {
            parsed = JSON.parse(data);
          }

          const foundPhrase = parsed?.seedPhrase || parsed?.mnemonic;
          if (foundPhrase) {
            phrase = foundPhrase;
            break;
          }
        } catch {
          continue;
        }
      }

      if (!phrase) {
        toast({
          title: "Recovery Phrase Not Available",
          description: "Your seed phrase is not stored on this device. Re-import your wallet to access it.",
          variant: "destructive"
        });
        onOpenChange(false);
        return false;
      }

      const words = phrase.trim().split(/\s+/);
      setSeedPhrase(words);
      return true;
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
  }, [onOpenChange, toast]);

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
                onClick={() => {
                  if (loadSeedPhrase()) {
                    setStep("reveal");
                  }
                }}
              >
                I Understand
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
  );
};

export default RecoveryPhraseReveal;
