import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Copy, Eye, EyeOff, AlertTriangle, Check, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MnemonicBackupScreenProps {
  mnemonic: string;
  walletAddress: string;
  onConfirmed: () => void;
  onBack: () => void;
}

const MnemonicBackupScreen = ({
  mnemonic,
  walletAddress,
  onConfirmed,
  onBack,
}: MnemonicBackupScreenProps) => {
  const { toast } = useToast();
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [confirmations, setConfirmations] = useState({
    saved: false,
    understood: false,
    noScreenshot: false,
  });
  const [copied, setCopied] = useState(false);

  const mnemonicWords = mnemonic.split(" ");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Mnemonic phrase copied to clipboard. Save it securely!",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      });
    }
  };

  const allConfirmed = Object.values(confirmations).every((v) => v);

  return (
    <div 
      className="h-screen overflow-hidden flex flex-col bg-gradient-to-b from-background via-background to-primary/5" 
      style={{ 
        height: '100dvh',
        paddingTop: 'max(env(safe-area-inset-top), 8px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        paddingLeft: '16px',
        paddingRight: '16px'
      }}
    >
      {/* Header */}
      <div className="flex items-center py-4 mb-2 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          className="mr-2 min-w-[44px] min-h-[44px]"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-lg font-semibold">Backup Recovery Phrase</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Card className="w-full max-w-2xl mx-auto p-6 sm:p-8 space-y-6 backdrop-blur-sm bg-card/95 border-primary/20 mb-4">
          {/* Title */}
          <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Shield className="h-16 w-16 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            Backup Your Recovery Phrase
          </h1>
          <p className="text-muted-foreground">
            This is your ONLY way to recover your wallet
          </p>
        </div>

        {/* Critical Warning */}
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <AlertDescription className="text-destructive font-semibold">
            ⚠️ CRITICAL: This phrase will NEVER be shown again!
            <br />
            If you lose it, you lose access to your wallet FOREVER.
          </AlertDescription>
        </Alert>

        {/* Wallet Info */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm text-muted-foreground">Your Wallet Address:</p>
          <p className="font-mono text-xs break-all text-foreground">
            {walletAddress}
          </p>
        </div>

        {/* Mnemonic Display */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">12-Word Recovery Phrase</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMnemonic(!showMnemonic)}
              >
                {showMnemonic ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Show
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!showMnemonic}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div
            className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 p-4 sm:p-6 rounded-lg border-2 ${
              showMnemonic
                ? "bg-background border-primary"
                : "bg-muted/30 border-muted blur-sm"
            }`}
          >
            {mnemonicWords.map((word, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 sm:p-3 bg-card rounded border"
              >
                <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                  {index + 1}.
                </span>
                <span className="font-mono font-semibold text-sm sm:text-base text-foreground truncate">
                  {showMnemonic ? word : "••••"}
                </span>
              </div>
            ))}
          </div>

          {!showMnemonic && (
            <p className="text-center text-sm text-muted-foreground">
              Click "Show" to reveal your recovery phrase
            </p>
          )}
        </div>

        {/* Security Checklist */}
        <div className="space-y-4 p-6 bg-muted/30 rounded-lg">
          <h3 className="font-semibold text-foreground">
            Security Checklist (Required)
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={confirmations.saved}
                onCheckedChange={(checked) =>
                  setConfirmations((prev) => ({ ...prev, saved: !!checked }))
                }
                className="mt-1"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                ✅ I have written down my recovery phrase on paper and stored it
                in a safe place
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={confirmations.understood}
                onCheckedChange={(checked) =>
                  setConfirmations((prev) => ({
                    ...prev,
                    understood: !!checked,
                  }))
                }
                className="mt-1"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                ⚠️ I understand that if I lose my recovery phrase, I will lose
                access to my wallet forever
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <Checkbox
                checked={confirmations.noScreenshot}
                onCheckedChange={(checked) =>
                  setConfirmations((prev) => ({
                    ...prev,
                    noScreenshot: !!checked,
                  }))
                }
                className="mt-1"
              />
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                🔒 I will NOT take screenshots or store this phrase digitally
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button variant="outline" onClick={onBack} className="flex-1">
            Go Back
          </Button>
          <Button
            onClick={onConfirmed}
            disabled={!allConfirmed}
            className="flex-1"
            size="lg"
          >
            I Have Saved My Recovery Phrase
          </Button>
        </div>

        {/* Tips */}
        <div className="space-y-2 text-xs text-muted-foreground bg-muted/20 p-4 rounded">
          <p className="font-semibold text-foreground">💡 Best Practices:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Write on paper, store in a fireproof safe</li>
            <li>Never share your recovery phrase with anyone</li>
            <li>Consider splitting and storing in multiple locations</li>
            <li>Our support team will NEVER ask for your phrase</li>
          </ul>
        </div>
        </Card>
      </div>
    </div>
  );
};

export default MnemonicBackupScreen;
