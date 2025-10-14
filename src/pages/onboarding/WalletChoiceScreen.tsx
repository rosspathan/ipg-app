import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Plus, Download } from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';
import { OnboardingCard } from '@/components/onboarding/OnboardingCard';

interface WalletChoiceScreenProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  onBack: () => void;
}

const WalletChoiceScreen: React.FC<WalletChoiceScreenProps> = ({
  onCreateWallet,
  onImportWallet,
  onBack
}) => {
  const walletOptions = [
    {
      id: 'create',
      title: 'Create New Wallet',
      description: 'Generate a secure 12 or 24-word recovery phrase',
      icon: Plus,
      gradient: 'from-blue-500 to-cyan-500',
      action: onCreateWallet,
      recommended: true
    },
    {
      id: 'import',
      title: 'Import Existing Wallet',
      description: 'Use your existing seed phrase to restore wallet',
      icon: Download,
      gradient: 'from-purple-500 to-pink-500',
      action: onImportWallet,
      recommended: false
    }
  ];

  return (
    <OnboardingLayout gradientVariant="primary" className="px-0">
      <div className="flex flex-col h-full px-6">
        <OnboardingHeader 
          title="Setup Wallet"
          showBack
          onBack={onBack}
        />
        
        <ProgressIndicator 
          currentStep={2}
          totalSteps={8}
          stepName="Choose Wallet"
          className="mt-4"
        />

        <div className="flex-1 pb-4 overflow-y-auto mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">🔐</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              Choose Wallet Setup
            </h2>
            <p className="text-white/80 text-base max-w-sm mx-auto">
              Select how you'd like to set up your Web3 wallet for IPG iSmart Exchange
            </p>
          </motion.div>

          {/* Wallet Options */}
          <div className="space-y-4 max-w-md mx-auto">
            {walletOptions.map((option, index) => {
              const IconComponent = option.icon;
              return (
                <motion.div
                  key={option.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.5, 
                    delay: 0.2 + (index * 0.1) 
                  }}
                >
                  <OnboardingCard 
                    variant="glass" 
                    hover
                    className="relative cursor-pointer"
                  >
                    <div onClick={option.action}>
                      {option.recommended && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                          Recommended
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 bg-gradient-to-r ${option.gradient} rounded-xl flex items-center justify-center flex-shrink-0`}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg mb-1">
                            {option.title}
                          </h3>
                          <p className="text-white/70 text-sm">
                            {option.description}
                          </p>
                        </div>
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-white/50"
                        >
                          →
                        </motion.div>
                      </div>
                    </div>
                  </OnboardingCard>
                </motion.div>
              );
            })}
          </div>

          {/* Security Notice */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-8 max-w-md mx-auto"
          >
            <OnboardingCard variant="gradient" className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
              <div className="flex items-start space-x-3">
                <span className="text-2xl flex-shrink-0">🛡️</span>
                <div>
                  <h4 className="text-white font-semibold text-sm mb-1">
                    Security First
                  </h4>
                  <p className="text-white/80 text-xs leading-relaxed">
                    Your wallet keys are stored locally on your device. We never have access to your private keys or recovery phrase.
                  </p>
                </div>
              </div>
            </OnboardingCard>
          </motion.div>

          {/* Network Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="mt-6 text-center"
          >
            <p className="text-white/60 text-xs">
              Supports BEP20 (BSC) and ERC20 (Ethereum) networks
            </p>
          </motion.div>
        </div>
      </div>
    </OnboardingLayout>
  );
};

export default WalletChoiceScreen;
