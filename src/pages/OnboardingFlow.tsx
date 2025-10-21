import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuthUser } from '@/hooks/useAuthUser';
import WalletChoiceScreen from './onboarding/WalletChoiceScreen';
import CreateWalletScreen from './onboarding/CreateWalletScreen';
import ImportWalletScreen from './onboarding/ImportWalletScreen';
import PinSetupScreen from './onboarding/PinSetupScreen';
import BiometricSetupScreen from './onboarding/BiometricSetupScreen';
import SuccessCelebrationScreen from './onboarding/SuccessCelebrationScreen';

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
      // No user session - redirect to login
      navigate('/auth/login', { replace: true });
      return;
    }

    if (path === '/onboarding/wallet') {
      setStep('wallet-choice');
    } else if (path === '/onboarding/security') {
      setStep('pin-setup');
    } else {
      // Default to wallet choice
      setStep('wallet-choice');
    }
  }, [user, loading, navigate, setStep]);

  const handleWalletChoice = (choice: 'create' | 'import') => {
    setStep(choice + '-wallet' as any);
  };

  const handleWalletCreated = (wallet: any) => {
    setWalletInfo(wallet);
    setStep('pin-setup');
  };
  
  const handleWalletImported = (wallet: any) => {
    setWalletInfo(wallet);
    setStep('pin-setup');
  };

  const handlePinSetup = (pinHash: string) => {
    setPinHash(pinHash);
    setStep('biometric-setup');
  };

  const handleBiometricSetup = (success: boolean) => {
    markBiometricSetup(success);
    setStep('success');
  };

  // Render based on current step
  switch (state.step) {
    case 'wallet-choice':
      return (
        <WalletChoiceScreen
          onCreateWallet={() => setStep('create-wallet')}
          onImportWallet={() => setStep('import-wallet')}
          onBack={() => navigate('/')}
        />
      );
    
    case 'create-wallet':
      return (
        <CreateWalletScreen
          onWalletCreated={handleWalletCreated}
          onBack={() => setStep('wallet-choice')}
        />
      );
    
    case 'import-wallet':
      return (
        <ImportWalletScreen
          onWalletImported={handleWalletImported}
          onBack={() => setStep('wallet-choice')}
        />
      );
    
    case 'pin-setup':
      return (
        <PinSetupScreen
          onPinSetup={handlePinSetup}
          onBack={() => setStep('create-wallet')}
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
          onCreateWallet={() => setStep('create-wallet')}
          onImportWallet={() => setStep('import-wallet')}
          onBack={() => navigate('/')}
        />
      );
  }
};

export default OnboardingFlow;
