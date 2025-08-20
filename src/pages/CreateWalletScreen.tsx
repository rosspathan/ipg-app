import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Copy, Download, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
    try {
      await navigator.clipboard.writeText(seedPhrase.join(" "));
      toast({
        title: "Copied!",
        description: "Seed phrase copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy seed phrase",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const content = `CryptoFlow Wallet Seed Phrase\n\nCreated: ${new Date().toLocaleDateString()}\n\nSeed Phrase:\n${seedPhrase.join(" ")}\n\nIMPORTANT: Store this phrase in a secure location. Never share it with anyone.`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cryptoflow-seed-phrase.txt";
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
      navigate("/email-verification");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create wallet",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Create Wallet</h1>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full space-y-6">
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
            <div className="grid grid-cols-2 gap-3">
              {seedPhrase.map((word, index) => (
                <div key={index} className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                  <span className="text-xs text-muted-foreground font-medium w-6">
                    {index + 1}.
                  </span>
                  <span className="font-medium text-sm">{word}</span>
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
  );
};

export default CreateWalletScreen;