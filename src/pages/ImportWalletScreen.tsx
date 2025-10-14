import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/contexts/Web3Context";
import { Buffer } from 'buffer';
import * as bip39 from "bip39";
import { motion } from 'framer-motion';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';
import { OnboardingCard } from '@/components/onboarding/OnboardingCard';

// Make Buffer available globally for bip39
(window as any).Buffer = Buffer;

const ImportWalletScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { importWallet } = useWeb3();
  const [seedPhrase, setSeedPhrase] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async () => {
    setIsValidating(true);
    setError("");

    try {
      if (!email.trim()) {
        setError("Please enter your email address");
        return;
      }

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

      // Import the wallet using Web3 context
      await importWallet(cleanPhrase);
      
      toast({
        title: "Success!",
        description: "Wallet imported successfully",
      });

      // Navigate to security setup
      setTimeout(() => {
        navigate("/onboarding/security");
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
    <OnboardingLayout gradientVariant="primary" className="px-0">
      <div className="flex flex-col h-full px-6">
        <OnboardingHeader 
          title="Import Wallet"
          showBack
          onBack={() => navigate(-1)}
        />
        
        <ProgressIndicator 
          currentStep={3}
          totalSteps={8}
          stepName="Import Wallet"
          className="mt-4"
        />

        <div className="flex-1 pb-4 overflow-y-auto space-y-6 mt-6">
          {/* Title */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Download className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Enter Recovery Phrase
            </h2>
            <p className="text-white/80 text-base max-w-md mx-auto">
              Enter your 12 or 24-word recovery phrase to restore your wallet
            </p>
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <OnboardingCard variant="glass">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-white/90 text-sm font-medium">Email Address</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter the email used during wallet creation"
                    className="bg-black/30 border-white/30 text-white placeholder:text-white/50 focus:border-blue-400"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-white/90 text-sm font-medium">Recovery Phrase</label>
                  <Textarea
                    value={seedPhrase}
                    onChange={(e) => handlePhraseChange(e.target.value)}
                    placeholder="Enter your recovery phrase (separate words with spaces)"
                    rows={6}
                    className="resize-none bg-black/30 border-white/30 text-white placeholder:text-white/50 focus:border-blue-400"
                  />
                </div>
                
                {error && (
                  <div className="flex items-center space-x-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  variant="default" 
                  size="lg" 
                  onClick={handleValidate}
                  disabled={!seedPhrase.trim() || !email.trim() || isValidating}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl"
                >
                  {isValidating ? "Validating..." : "Validate & Import"}
                </Button>
                
                <Button 
                  variant="ghost" 
                  size="lg" 
                  onClick={() => navigate("/create-wallet")}
                  className="w-full text-white hover:bg-white/10 rounded-xl"
                >
                  Create New Wallet Instead
                </Button>
              </div>
            </OnboardingCard>
          </motion.div>

          {/* Security Tips */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <OnboardingCard variant="gradient" className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <h4 className="text-yellow-200 font-semibold text-sm mb-2 flex items-center">
                <span className="mr-2">💡</span>
                Security Tips
              </h4>
              <ul className="text-yellow-200/80 text-xs space-y-1">
                <li>• Make sure you're in a secure location</li>
                <li>• Never share your recovery phrase with anyone</li>
                <li>• Your phrase is encrypted and stored only on this device</li>
              </ul>
            </OnboardingCard>
          </motion.div>
        </div>
      </div>
    </OnboardingLayout>
  );
};

export default ImportWalletScreen;
