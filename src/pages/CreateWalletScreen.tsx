import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Copy, Download, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
import { useWeb3 } from "@/contexts/Web3Context";
import { Buffer } from 'buffer';
import * as bip39 from "bip39";

// Make Buffer available globally for bip39
(window as any).Buffer = Buffer;

const CreateWalletScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createWallet } = useWeb3();
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);

  useEffect(() => {
    const mnemonic = bip39.generateMnemonic();
    setSeedPhrase(mnemonic.split(" "));
  }, []);

  const handleCopy = async () => {
    const success = await copyToClipboard(seedPhrase.join(" "));
    
    if (success) {
      toast({
        title: "Copied!",
        description: "Seed phrase copied to clipboard",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to copy seed phrase",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const content = `IPG i-SMART Wallet Seed Phrase\n\nCreated: ${new Date().toLocaleDateString()}\n\nSeed Phrase:\n${seedPhrase.join(" ")}\n\nIMPORTANT: Store this phrase in a secure location. Never share it with anyone.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ipg-ismart-seed-phrase.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded!",
      description: "Seed phrase saved to file",
    });
  };

  const handleConfirmPhrase = async () => {
    try {
      await createWallet(seedPhrase.join(" "));
      navigate("/onboarding/security");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create wallet",
        variant: "destructive",
      });
    }
  };

  return (
    <div 
      className="h-screen overflow-hidden flex flex-col bg-background" 
      style={{ 
        height: '100dvh',
        paddingTop: 'max(env(safe-area-inset-top), 8px)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        paddingLeft: '24px',
        paddingRight: '24px'
      }}
    >
      <div className="flex items-center py-4 mb-4 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/onboarding")}
          className="mr-2 min-w-[44px] min-h-[44px]"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-semibold">Create Wallet</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-sm mx-auto w-full space-y-6 pb-4">
          <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Save Your Recovery Phrase
          </h2>
          <p className="text-sm text-muted-foreground">
            Write down or save these 12 words in order. You'll need them to recover your wallet.
          </p>
        </div>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base text-center">Recovery Phrase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {seedPhrase.map((word, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 sm:p-3 bg-muted rounded-lg">
                  <span className="text-xs text-muted-foreground font-medium w-5 sm:w-6 flex-shrink-0">
                    {index + 1}.
                  </span>
                  <span className="font-medium text-xs sm:text-sm truncate">{word}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleCopy}
            className="w-full"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Phrase
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            onClick={handleDownload}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          
          <Button 
            variant="default" 
            size="lg" 
            onClick={handleConfirmPhrase}
            className="w-full"
          >
            I've Saved My Phrase
          </Button>
          </div>

          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-xs text-destructive-foreground/80 text-center">
              ⚠️ Never share your recovery phrase. Anyone with this phrase can access your wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWalletScreen;