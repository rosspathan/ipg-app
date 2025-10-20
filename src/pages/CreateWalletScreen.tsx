import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/utils/clipboard";
import { Buffer } from 'buffer';
import * as bip39 from "bip39";
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';
import { OnboardingCard } from '@/components/onboarding/OnboardingCard';

// Make Buffer available globally for bip39
(window as any).Buffer = Buffer;

interface CreateWalletScreenProps {
  onWalletCreated: (wallet: { address: string; mnemonic: string; privateKey: string }) => void;
  onBack: () => void;
}

const CreateWalletScreen = ({ onWalletCreated, onBack }: CreateWalletScreenProps) => {
  const { toast } = useToast();
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
      // Derive wallet from mnemonic
      const mnemonic = seedPhrase.join(" ");
      const wallet = ethers.Wallet.fromPhrase(mnemonic);
      
      const walletData = {
        address: wallet.address,
        mnemonic: mnemonic,
        privateKey: wallet.privateKey
      };
      
      // Pass to parent instead of navigating
      onWalletCreated(walletData);
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
      <div className="flex flex-col h-full px-6 bg-black/30 backdrop-blur-sm rounded-t-3xl">
        <OnboardingHeader 
          title="Create Wallet"
          showBack
          onBack={onBack}
        />
        
        <ProgressIndicator 
          currentStep={3}
          totalSteps={6}
          stepName="Backup Phrase"
          className="mt-4"
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1 pb-4 overflow-y-auto space-y-6 mt-6"
        >
          {/* Title */}
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Backup Your Recovery Phrase
            </h2>
            <p className="text-white/90 text-base max-w-md mx-auto">
              Write down these 12 words in order and store them safely
            </p>
          </div>

          {/* Seed Phrase Display */}
          <OnboardingCard variant="glass" className="bg-white/20 backdrop-blur-md border-white/30">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {seedPhrase.map((word, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-white/20 rounded-xl border border-white/40 backdrop-blur-sm">
                  <span className="text-sm text-white/90 font-semibold w-8 flex-shrink-0">
                    {index + 1}.
                  </span>
                  <span className="font-semibold text-white text-base">{word}</span>
                </div>
              ))}
            </div>
          </OnboardingCard>

          {/* Warning Message */}
          <OnboardingCard 
            variant="gradient" 
            className="bg-gradient-to-r from-orange-500/30 to-red-500/30 backdrop-blur-md border-2 border-orange-400/80"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <p className="text-white text-sm leading-relaxed font-semibold">
                <span className="block mb-1 text-base">Never share this phrase!</span>
                Anyone with your recovery phrase can access your funds.
              </p>
            </div>
          </OnboardingCard>

          {/* Action Buttons */}
          <div className="space-y-4">
            {/* Primary action */}
            <Button 
              size="lg" 
              onClick={handleConfirmPhrase}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold text-base rounded-xl shadow-lg shadow-blue-500/20 min-h-[56px]"
            >
              I've Saved My Phrase – Continue
            </Button>

            {/* Secondary actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleCopy}
                className="border-2 border-white/40 text-white hover:bg-white/20 rounded-xl font-semibold backdrop-blur-sm"
              >
                <Copy className="w-5 h-5 mr-2" />
                Copy
              </Button>
              
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleDownload}
                className="border-2 border-white/40 text-white hover:bg-white/20 rounded-xl font-semibold backdrop-blur-sm"
              >
                <Download className="w-5 h-5 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </OnboardingLayout>
  );
};

export default CreateWalletScreen;
