import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuthUser } from '@/hooks/useAuthUser';
import WalletChoiceScreen from './onboarding/WalletChoiceScreen';
import CreateWalletScreen from './onboarding/CreateWalletScreen';
import ImportWalletScreen from './onboarding/ImportWalletScreen';
import ReferralCodeInputScreen from './onboarding/ReferralCodeInputScreen';
import PinSetupScreen from './onboarding/PinSetupScreen';
import BiometricSetupScreen from './onboarding/BiometricSetupScreen';
import SuccessCelebrationScreen from './onboarding/SuccessCelebrationScreen';
import { storePendingReferral } from '@/utils/referralCapture';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * OnboardingFlow - Post-authentication wallet and security setup
 * 
 * New Flow (after user signs up/logs in):
 * 1. /onboarding/wallet -> Wallet creation/import
 * 2. /onboarding/security -> PIN + biometric setup
 * 3. Complete -> /app/home
 */
const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const {
    state,
    setStep,
    setWalletInfo,
    setReferralCode,
    setPinHash,
    markBiometricSetup,
    completeOnboarding
  } = useOnboarding();

  // Determine initial step based on URL path
  useEffect(() => {
    const path = window.location.pathname;

    // Wait for auth to be ready before deciding
    if (loading) return;

    if (!user) {
      // No user session - redirect to signup
      navigate('/auth/signup', { replace: true });
      return;
    }

    // Map path to step, then only update when different to avoid loops
    let targetStep: typeof state.step | null = null;
    if (path.includes('/onboarding/referral')) {
      targetStep = 'referral-code';
    } else if (path === '/onboarding/wallet') {
      targetStep = 'wallet-choice';
    } else if (path === '/onboarding/wallet/create') {
      targetStep = 'create-wallet';
    } else if (path === '/onboarding/wallet/import') {
      targetStep = 'import-wallet';
    } else if (path.includes('/onboarding/security')) {
      targetStep = 'pin-setup';
    } else {
      // Default to referral code entry
      targetStep = 'referral-code';
    }

    if (targetStep && state.step !== targetStep) {
      setStep(targetStep as any);
    }
  }, [user, loading, navigate, setStep, state.step]);

  const handleReferralSubmitted = (code: string, sponsorId: string) => {
    storePendingReferral(code, sponsorId);
    setReferralCode(code, sponsorId);
    navigate('/onboarding/wallet');
  };

  const handleReferralSkipped = () => {
    navigate('/onboarding/wallet');
  };

  const handleWalletChoice = (choice: 'create' | 'import') => {
    setStep(choice + '-wallet' as any);
  };

  const handleWalletCreated = (wallet: any) => {
    setWalletInfo(wallet);
    navigate('/onboarding/security');
  };
  
  const handleWalletImported = (wallet: any) => {
    setWalletInfo(wallet);
    navigate('/onboarding/security');
  };

  const handlePinSetup = (pinHash: string) => {
    setPinHash(pinHash);
    setStep('biometric-setup');
  };

  const handleBiometricSetup = (success: boolean) => {
    markBiometricSetup(success);
    setStep('success');
  };

  // Show message if user arrives without proper auth
  if (!user && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-background flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Account Required</h2>
          <p className="text-white/80">
            You need to create an account before setting up your wallet and security.
          </p>
          <Button
            onClick={() => navigate('/auth/signup')}
            className="w-full bg-white text-primary hover:bg-white/90 font-semibold"
          >
            Create Account
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/auth/login')}
            className="w-full text-white hover:bg-white/10"
          >
            Already have an account? Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Render based on current step
  switch (state.step) {
    case 'referral-code':
      return (
        <ReferralCodeInputScreen
          onCodeSubmitted={handleReferralSubmitted}
          onSkip={handleReferralSkipped}
          onBack={() => navigate('/auth/signup')}
        />
      );
    
    case 'wallet-choice':
      return (
        <WalletChoiceScreen
          onCreateWallet={() => { setStep('create-wallet'); navigate('/onboarding/wallet/create'); }}
          onImportWallet={() => { setStep('import-wallet'); navigate('/onboarding/wallet/import'); }}
          onBack={() => { setStep('referral-code'); navigate('/onboarding/referral'); }}
        />
      );
    
    case 'create-wallet':
      return (
        <CreateWalletScreen
          onWalletCreated={handleWalletCreated}
          onBack={() => { setStep('wallet-choice'); navigate('/onboarding/wallet'); }}
        />
      );
    
    case 'import-wallet':
      return (
        <ImportWalletScreen
          onWalletImported={handleWalletImported}
          onBack={() => { setStep('wallet-choice'); navigate('/onboarding/wallet'); }}
        />
      );
    
    case 'pin-setup':
      return (
        <PinSetupScreen
          onPinSetup={handlePinSetup}
          onBack={() => { setStep('wallet-choice'); navigate('/onboarding/wallet'); }}
        />
      );
    
    case 'biometric-setup':
      return (
        <BiometricSetupScreen
          onBiometricSetup={handleBiometricSetup}
          onSkip={() => handleBiometricSetup(false)}
          onBack={() => setStep('pin-setup')}
        />
      );
    
    case 'success':
      return (
        <SuccessCelebrationScreen 
          hasBiometric={state.biometricSetup || false}
          onComplete={completeOnboarding}
        />
      );
    
    default:
      return (
        <WalletChoiceScreen
          onCreateWallet={() => { setStep('create-wallet'); navigate('/onboarding/wallet/create'); }}
          onImportWallet={() => { setStep('import-wallet'); navigate('/onboarding/wallet/import'); }}
          onBack={() => { setStep('referral-code'); navigate('/onboarding/referral'); }}
        />
      );
  }
};

export default OnboardingFlow;
