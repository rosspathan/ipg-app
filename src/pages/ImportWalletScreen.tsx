import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Buffer } from 'buffer';
import * as bip39 from "bip39";

// Make Buffer available globally for bip39
(window as any).Buffer = Buffer;

const ImportWalletScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [seedPhrase, setSeedPhrase] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    setError("");

    try {
      const cleanPhrase = seedPhrase.trim().toLowerCase();
      const words = cleanPhrase.split(/\s+/);

      if (words.length !== 12 && words.length !== 24) {
        setError("Please enter 12 or 24 words");
        return;
      }

      const isValid = bip39.validateMnemonic(cleanPhrase);
      
      if (!isValid) {
        setError("Invalid recovery phrase. Please check your words and try again.");
        return;
      }

      toast({
        title: "Success!",
        description: "Valid recovery phrase detected",
      });

      // Simulate validation delay
      setTimeout(() => {
        navigate("/security-setup");
      }, 1000);

    } catch (err) {
      setError("Invalid recovery phrase format");
    } finally {
      setIsValidating(false);
    }
  };

  const handlePhraseChange = (value: string) => {
    setSeedPhrase(value);
    if (error) setError("");
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
        <h1 className="text-xl font-semibold">Import Wallet</h1>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Enter Recovery Phrase
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter your 12 or 24-word recovery phrase to restore your wallet.
          </p>
        </div>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base text-center">Recovery Phrase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={seedPhrase}
              onChange={(e) => handlePhraseChange(e.target.value)}
              placeholder="Enter your recovery phrase (separate words with spaces)"
              rows={6}
              className="resize-none text-sm"
            />
            
            {error && (
              <div className="flex items-center space-x-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p>• Words should be separated by spaces</p>
              <p>• Only 12 or 24 word phrases are supported</p>
              <p>• Check spelling carefully</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <Button 
            variant="default" 
            size="lg" 
            onClick={handleValidate}
            disabled={!seedPhrase.trim() || isValidating}
            className="w-full"
          >
            {isValidating ? "Validating..." : "Validate & Import"}
          </Button>
          
          <Button 
            variant="ghost" 
            size="lg" 
            onClick={() => navigate("/create-wallet")}
            className="w-full"
          >
            Create New Wallet Instead
          </Button>
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground text-center">
            💡 Make sure you're in a secure environment when entering your recovery phrase.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImportWalletScreen;