import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Copy, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
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
    <OnboardingLayout gradientVariant="primary" className="px-0">
      <div className="flex flex-col h-full px-6">
        <OnboardingHeader 
          title="Create Wallet"
          showBack
          onBack={() => navigate(-1)}
        />
        
        <ProgressIndicator 
          currentStep={3}
          totalSteps={8}
          stepName="Backup Phrase"
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
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Backup Your Recovery Phrase
            </h2>
            <p className="text-white/80 text-base max-w-md mx-auto">
              Write down these 12 words in order and store them safely
            </p>
          </motion.div>

          {/* Seed Phrase Display */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <OnboardingCard variant="glass">
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {seedPhrase.map((word, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 sm:p-3 bg-white/10 rounded-lg border border-white/20">
                      <span className="text-xs text-white/60 font-medium w-5 sm:w-6 flex-shrink-0">
                        {index + 1}.
                      </span>
                      <span className="font-medium text-white text-xs sm:text-sm truncate">{word}</span>
                    </div>
                  ))}
                </div>
              </div>
            </OnboardingCard>
          </motion.div>

          {/* Warning Message */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <OnboardingCard variant="gradient" className="bg-gradient-to-r from-orange-900/95 to-red-900/95 border-orange-500/60">
              <p className="text-orange-50 text-sm leading-relaxed font-medium">
                ⚠️ <span className="text-white font-semibold">Never share this phrase with anyone.</span> Anyone with your recovery phrase can access your funds.
              </p>
            </OnboardingCard>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleCopy}
              className="w-full border-white/30 text-white hover:bg-white/10 rounded-xl"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Phrase
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleDownload}
              className="w-full border-white/30 text-white hover:bg-white/10 rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            
            <Button 
              variant="default" 
              size="lg" 
              onClick={handleConfirmPhrase}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl"
            >
              I've Saved My Phrase
            </Button>
          </motion.div>
        </div>
      </div>
    </OnboardingLayout>
  );
};

export default CreateWalletScreen;
