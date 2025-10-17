import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';
import { OnboardingCard } from '@/components/onboarding/OnboardingCard';

interface WelcomeScreensProps {
  onComplete: () => void;
  onBack?: () => void;
}

interface ScreenData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: string;
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

const screens: ScreenData[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Future',
    subtitle: 'IPG I-Smart Exchange',
    description: 'World\'s No.1 trusted crypto exchange.',
    icon: '🚀',
    gradient: 'from-blue-600 via-purple-600 to-indigo-700',
    features: [
      {
        icon: '🌟',
        title: 'Next-Gen Platform',
        description: 'State-of-the-art trading technology'
      },
      {
        icon: '🌍',
        title: 'Global Community',
        description: 'Join millions of active traders'
      },
      {
        icon: '⚡',
        title: 'Lightning Fast',
        description: 'Real-time trading and instant rewards'
      }
    ]
  },
  {
    id: 'security',
    title: 'Bank-Level Security',
    subtitle: 'Your Safety First',
    description: 'Advanced encryption, biometric locks, and multi-layer security protect your assets.',
    icon: '🔐',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    features: [
      {
        icon: '🛡️',
        title: 'Military-Grade Encryption',
        description: 'AES-256 encryption for all data'
      },
      {
        icon: '👆',
        title: 'Biometric Security',
        description: 'Face ID & fingerprint protection'
      },
      {
        icon: '🔑',
        title: 'Web3 Wallet',
        description: 'Self-custody with BIP39 recovery'
      }
    ]
  },
  {
    id: 'earnings',
    title: 'Multiple Ways to Earn',
    subtitle: 'BSK Rewards Ecosystem',
    description: 'Earn BSK tokens through trading, referrals, ads, games, and exclusive programs.',
    icon: '💎',
    gradient: 'from-yellow-500 via-orange-500 to-red-600',
    features: [
      {
        icon: '🎰',
        title: 'Spin & Win',
        description: 'Daily spin wheels with BSK prizes'
      },
      {
        icon: '👥',
        title: 'Referral Rewards',
        description: '50-level deep referral system'
      },
      {
        icon: '📺',
        title: 'Ad Mining',
        description: 'Watch ads, earn BSK tokens'
      }
    ]
  },
  {
    id: 'support',
    title: '24/7 Expert Support',
    subtitle: 'We\'re Here to Help',
    description: 'Round-the-clock customer support, comprehensive guides, and community forums.',
    icon: '🎯',
    gradient: 'from-pink-500 via-rose-500 to-violet-600',
    features: [
      {
        icon: '💬',
        title: 'Live Chat Support',
        description: 'Instant help when you need it'
      },
      {
        icon: '📚',
        title: 'Learning Center',
        description: 'Comprehensive trading guides'
      },
      {
        icon: '🏆',
        title: 'VIP Programs',
        description: 'Exclusive benefits for active users'
      }
    ]
  }
];

const WelcomeScreens: React.FC<WelcomeScreensProps> = ({ onComplete, onBack }) => {
  const [currentScreen, setCurrentScreen] = useState(0);

  const nextScreen = () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      onComplete();
    }
  };

  const previousScreen = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const current = screens[currentScreen];

  return (
    <OnboardingLayout gradientVariant="primary" className="px-0">
      <div className="flex flex-col h-full px-6">
        <OnboardingHeader 
          showBack
          onBack={previousScreen}
          rightAction={
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-white/80 hover:text-white hover:bg-white/10"
            >
              Skip
            </Button>
          }
        />
        
        <ProgressIndicator 
          currentStep={currentScreen + 1}
          totalSteps={screens.length}
          stepName={current.title}
          className="mt-4"
        />

        <div className="flex-1 pb-4 overflow-y-auto mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScreen}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="h-full flex flex-col"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="text-center mb-8"
              >
                <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                  <span className="text-4xl">{current.icon}</span>
                </div>
              </motion.div>

              {/* Title & Subtitle */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center mb-8"
              >
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {current.title}
                </h1>
                <h2 className="text-xl text-white/90 font-semibold mb-4">
                  {current.subtitle}
                </h2>
                <p className="text-white/80 text-base leading-relaxed max-w-md mx-auto">
                  {current.description}
                </p>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex-1 space-y-4"
              >
                {current.features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.5 + (index * 0.1) 
                    }}
                  >
                    <OnboardingCard variant="glass">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">{feature.icon}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-semibold text-lg mb-1">
                            {feature.title}
                          </h3>
                          <p className="text-white/80 text-sm">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    </OnboardingCard>
                  </motion.div>
                ))}
              </motion.div>

              {/* Action Button */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="pt-8"
              >
                <Button
                  onClick={nextScreen}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-2xl transition-all duration-300"
                  size="lg"
                >
                  {currentScreen === screens.length - 1 ? (
                    <>
                      Get Started
                      <motion.span
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="ml-2"
                      >
                        🚀
                      </motion.span>
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </OnboardingLayout>
  );
};

export default WelcomeScreens;