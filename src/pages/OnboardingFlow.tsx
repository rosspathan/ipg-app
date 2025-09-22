import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useWeb3 } from '@/contexts/Web3Context';
import SplashScreen from './onboarding/SplashScreen';
import WelcomeScreens from './onboarding/WelcomeScreens';
import WalletChoiceScreen from './onboarding/WalletChoiceScreen';
import CreateWalletScreen from './onboarding/CreateWalletScreen';
import ImportWalletScreen from './onboarding/ImportWalletScreen';
import WalletConnectScreen from './onboarding/WalletConnectScreen';
import EmailInputScreen from './onboarding/EmailInputScreen';
import EmailVerificationScreen from './onboarding/EmailVerificationScreen';
import PinSetupScreen from './onboarding/PinSetupScreen';
import BiometricSetupScreen from './onboarding/BiometricSetupScreen';

const OnboardingFlow: React.FC = () => {
  const {
    state,
    setStep,
    setWalletInfo,
    setEmail,
    markEmailVerified,
    setPinHash,
    markBiometricSetup,
    completeOnboarding,
    resetOnboarding
  } = useOnboarding();
  
  const { setWalletFromOnboarding } = useWeb3();

  const handleSplashComplete = () => setStep('welcome');
  const handleWelcomeComplete = () => setStep('wallet-choice');
  const handleWalletChoice = (choice: 'create' | 'import' | 'connect') => {
    if (choice === 'connect') {
      setStep('wallet-connect');
    } else {
      setStep(choice + '-wallet' as any);
    }
  };
  const handleWalletCreated = (wallet: any) => {
    setWalletInfo(wallet);
    setWalletFromOnboarding(wallet);
    setStep('email-input');
  };
  const handleEmailSubmitted = (email: string) => {
    setEmail(email);
    setStep('email-verification');
  };
  const handleEmailVerified = () => {
    markEmailVerified();
    setStep('pin-setup');
  };
  const handlePinSetup = (pinHash: string) => {
    setPinHash(pinHash);
    setStep('biometric-setup');
  };
  const handleBiometricSetup = (success: boolean) => {
    markBiometricSetup(success);
    completeOnboarding();
  };

  switch (state.step) {
    case 'splash':
      return <SplashScreen onComplete={handleSplashComplete} />;
    
    case 'welcome':
      return <WelcomeScreens onComplete={handleWelcomeComplete} onBack={() => setStep('splash')} />;
    
    case 'wallet-choice':
      return (
        <WalletChoiceScreen
          onCreateWallet={() => setStep('create-wallet')}
          onImportWallet={() => setStep('import-wallet')}
          onWalletConnect={() => setStep('wallet-connect')}
          onBack={() => setStep('welcome')}
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
          onWalletImported={handleWalletCreated}
          onBack={() => setStep('wallet-choice')}
        />
      );
    
    case 'wallet-connect':
      return (
        <WalletConnectScreen
          onWalletConnected={handleWalletCreated}
          onBack={() => setStep('wallet-choice')}
        />
      );
    
    case 'email-input':
      return (
        <EmailInputScreen
          onEmailSubmitted={handleEmailSubmitted}
          onBack={() => setStep('create-wallet')}
        />
      );
    
    case 'email-verification':
      return (
        <EmailVerificationScreen
          email={state.email || ''}
          onVerified={handleEmailVerified}
          onResendCode={() => {/* Resend logic */}}
          onBack={() => setStep('email-input')}
        />
      );
    
    case 'pin-setup':
      return (
        <PinSetupScreen
          onPinSetup={handlePinSetup}
          onBack={() => setStep('email-verification')}
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
    
    default:
      return <SplashScreen onComplete={handleSplashComplete} />;
  }
};

export default OnboardingFlow;