import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuthUser } from '@/hooks/useAuthUser';
import { extractUsernameFromEmail } from '@/lib/user/username';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import SplashScreen from './onboarding/SplashScreen';
import WelcomeScreens from './onboarding/WelcomeScreens';
import WalletChoiceScreen from './onboarding/WalletChoiceScreen';
import CreateWalletScreen from './onboarding/CreateWalletScreen';
import ImportWalletScreen from './onboarding/ImportWalletScreen';
import VerifyWalletAndEmailScreen from './onboarding/VerifyWalletAndEmailScreen';
import EmailInputScreen from './onboarding/EmailInputScreen';
// ReferralCodeInputScreen removed - now integrated in EmailVerificationScreen
import EmailVerificationScreen from './onboarding/EmailVerificationScreen';
import PinSetupScreen from './onboarding/PinSetupScreen';
import BiometricSetupScreen from './onboarding/BiometricSetupScreen';
import SuccessCelebrationScreen from './onboarding/SuccessCelebrationScreen';

const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthUser();
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
  
  const [showExistingSessionModal, setShowExistingSessionModal] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    if (user?.id) {
      setShowExistingSessionModal(true);
    }
  }, [user?.id]);

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
    // Wallet will be connected to Web3 after successful onboarding
    setStep('email-input');
  };
  
  const handleWalletImported = (wallet: any) => {
    // LOCAL-ONLY IMPORT: Store wallet and continue to verification
    setWalletInfo(wallet);
    // Wallet will be connected to Web3 after successful onboarding
    
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
    setStep('email-verification'); // Skip referral-code step
  };
  
  // handleResendCode removed - EmailVerificationScreen handles resends internally
  
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

  const handleContinueAsCurrentUser = () => {
    setShowExistingSessionModal(false);
    navigate('/app/home');
  };

  const handleSignOutAndCreateNew = async () => {
    await signOut();
    setShowExistingSessionModal(false);
    resetOnboarding();
  };

  // Show existing session modal if user is logged in
  if (showExistingSessionModal && user) {
    return (
      <AlertDialog open={showExistingSessionModal} onOpenChange={setShowExistingSessionModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You're Already Logged In</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You're currently logged in as <span className="font-semibold">{user.email}</span>.
              </p>
              <p className="text-muted-foreground">
                Would you like to continue with this account or sign out to create a new one?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <Button 
              onClick={handleContinueAsCurrentUser}
              variant="default"
              className="w-full"
            >
              Continue as {user.email}
            </Button>
            <Button 
              onClick={handleSignOutAndCreateNew}
              variant="outline"
              className="w-full"
            >
              Sign Out & Create New Account
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

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
    
    // 'referral-code' step removed - now integrated in EmailVerificationScreen

    case 'email-verification':
      return (
        <EmailVerificationScreen
          email={state.email || ''}
          walletAddress={state.walletInfo?.address}
          onVerified={handleEmailVerified}
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