import React from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useWeb3 } from '@/contexts/Web3Context';
import SplashScreen from './onboarding/SplashScreen';
import WelcomeScreens from './onboarding/WelcomeScreens';
import WalletChoiceScreen from './onboarding/WalletChoiceScreen';
import CreateWalletScreen from './onboarding/CreateWalletScreen';
import ImportWalletScreen from './onboarding/ImportWalletScreen';
import VerifyWalletAndEmailScreen from './onboarding/VerifyWalletAndEmailScreen';
import EmailInputScreen from './onboarding/EmailInputScreen';
import ReferralCodeInputScreen from './onboarding/ReferralCodeInputScreen';
import EmailVerificationScreen from './onboarding/EmailVerificationScreen';
import PinSetupScreen from './onboarding/PinSetupScreen';
import BiometricSetupScreen from './onboarding/BiometricSetupScreen';
import SuccessCelebrationScreen from './onboarding/SuccessCelebrationScreen';

const OnboardingFlow: React.FC = () => {
  const {
    state,
    setStep,
    setWalletInfo,
    setEmail,
    setReferralCode,
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
  
  const handleWalletImported = (wallet: any) => {
    // LOCAL-ONLY IMPORT: Store wallet and continue to verification
    setWalletInfo(wallet);
    setWalletFromOnboarding(wallet);
    
    // Save wallet to onboarding state
    try {
      localStorage.setItem('ipg_onboarding_state', JSON.stringify({
        ...state,
        walletInfo: wallet
      }));
    } catch (e) {
      console.error('[ONBOARDING] Failed to save wallet:', e);
    }
    
    // Navigate to combined wallet verification + email input screen
    setStep('verify-wallet-email');
  };
  const handleEmailSubmitted = (email: string) => {
    setEmail(email);
    setStep('referral-code');
  };
  
  const handleReferralCodeSubmitted = (code: string, sponsorId: string) => {
    setReferralCode(code, sponsorId);
    setStep('email-verification');
  };
  
  const handleReferralSkipped = () => {
    setStep('email-verification');
  };
  
  const handleResendCode = async () => {
    if (!state.email) return;
    
    const { generateVerificationCode, storeVerificationCode } = await import('@/utils/security');
    const { supabase } = await import('@/integrations/supabase/client');
    
    const verificationCode = generateVerificationCode();
    storeVerificationCode((state.email || '').trim().toLowerCase(), verificationCode);
    
    await supabase.functions.invoke('send-verification-email', {
      body: {
        email: state.email,
        verificationCode,
        userName: state.email.split('@')[0],
        isOnboarding: true
      }
    });
  };
  
  const handleEmailVerified = async () => {
    markEmailVerified();
    
    // Store referral if code was entered
    if (state.referralCode && state.sponsorId) {
      const { storePendingReferral } = await import('@/utils/referralCapture');
      storePendingReferral(state.referralCode, state.sponsorId);
    }
    
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
  
  const handleSuccessComplete = () => {
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
          onWalletImported={handleWalletImported}
          onBack={() => setStep('wallet-choice')}
        />
      );
    
    case 'verify-wallet-email':
      return (
        <VerifyWalletAndEmailScreen
          walletAddress={state.walletInfo?.address || ''}
          onVerified={handleEmailSubmitted}
          onBack={() => setStep('import-wallet')}
        />
      );
    
    case 'email-input':
      return (
        <EmailInputScreen
          walletAddress={state.walletInfo?.address}
          onEmailSubmitted={handleEmailSubmitted}
          onBack={() => setStep('create-wallet')}
        />
      );
    
    case 'referral-code':
      return (
        <ReferralCodeInputScreen
          onCodeSubmitted={handleReferralCodeSubmitted}
          onSkip={handleReferralSkipped}
          onBack={() => setStep('email-input')}
        />
      );
    
    case 'email-verification':
      return (
        <EmailVerificationScreen
          email={state.email || ''}
          walletAddress={state.walletInfo?.address}
          onVerified={handleEmailVerified}
          onResendCode={handleResendCode}
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
    
    case 'success':
      return (
        <SuccessCelebrationScreen 
          hasBiometric={state.biometricSetup || false}
        />
      );
    
    default:
      return <SplashScreen onComplete={handleSplashComplete} />;
  }
};

export default OnboardingFlow;