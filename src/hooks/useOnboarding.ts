import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WalletInfo } from '@/utils/wallet';
import { SecuritySetup, getSecuritySetup, storeSecuritySetup } from '@/utils/security';

export type OnboardingStep = 
  | 'splash'
  | 'welcome'
  | 'features'
  | 'security-intro'
  | 'support-intro'
  | 'wallet-choice'
  | 'create-wallet'
  | 'import-wallet'
  | 'verify-wallet-email'
  | 'wallet-connect'
  | 'email-input'
  | 'referral-code'
  | 'email-verification'
  | 'pin-setup'
  | 'biometric-setup'
  | 'success'
  | 'complete';

export interface OnboardingState {
  step: OnboardingStep;
  walletInfo?: WalletInfo;
  email?: string;
  verificationCode?: string;
  pinHash?: string;
  referralCode?: string;
  sponsorId?: string;
  hasCompletedWallet: boolean;
  hasVerifiedEmail: boolean;
  hasSetupPin: boolean;
  hasSetupBiometric: boolean;
  biometricSetup?: boolean;
}

const ONBOARDING_STORAGE_KEY = 'ipg_onboarding_state';

export function useOnboarding() {
  const navigate = useNavigate();
  
  const [state, setState] = useState<OnboardingState>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error loading onboarding state:', error);
      }
    }
    
    return {
      step: 'splash',
      hasCompletedWallet: false,
      hasVerifiedEmail: false,
      hasSetupPin: false,
      hasSetupBiometric: false,
      biometricSetup: false
    };
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const setStep = (step: OnboardingStep) => {
    updateState({ step });
  };

  const setWalletInfo = (walletInfo: WalletInfo) => {
    updateState({ 
      walletInfo, 
      hasCompletedWallet: true 
    });
  };

  const setEmail = (email: string) => {
    updateState({ email });
  };

  const setVerificationCode = (verificationCode: string) => {
    updateState({ verificationCode });
  };

  const markEmailVerified = () => {
    updateState({ hasVerifiedEmail: true });
  };

  const setPinHash = (pinHash: string) => {
    updateState({ 
      pinHash, 
      hasSetupPin: true 
    });
  };

  const markBiometricSetup = (success: boolean) => {
    updateState({ 
      hasSetupBiometric: success,
      biometricSetup: success
    });
  };

  const setReferralCode = (code: string, sponsorId: string) => {
    updateState({ referralCode: code, sponsorId });
  };

  const nextStep = () => {
    const stepOrder: OnboardingStep[] = [
      'splash',
      'welcome',
      'features',
      'security-intro',
      'support-intro',
      'wallet-choice',
      // Wallet creation steps are handled dynamically
      'email-input',
      'email-verification',
      'pin-setup',
      'biometric-setup',
      'success',
      'complete'
    ];

    const currentIndex = stepOrder.indexOf(state.step);
    if (currentIndex < stepOrder.length - 1) {
      setStep(stepOrder[currentIndex + 1]);
    }
  };

  const previousStep = () => {
    const stepOrder: OnboardingStep[] = [
      'splash',
      'welcome',
      'features',
      'security-intro',
      'support-intro',
      'wallet-choice',
      'email-input',
      'email-verification',
      'pin-setup',
      'biometric-setup',
      'success',
      'complete'
    ];

    const currentIndex = stepOrder.indexOf(state.step);
    if (currentIndex > 0) {
      setStep(stepOrder[currentIndex - 1]);
    }
  };

      const completeOnboarding = async () => {
    try {
      if (!state.walletInfo || !state.email || !state.pinHash) {
        throw new Error('Missing required onboarding data');
      }

      // Save security data locally first
      const { saveLocalSecurityData } = await import('@/utils/localSecurityStorage');
      await saveLocalSecurityData({
        pin: state.pinHash,
        biometric_enabled: state.hasSetupBiometric,
        anti_phishing_code: Math.random().toString(36).substring(2, 8).toUpperCase()
      });

      // Update security setup
      const securitySetup: SecuritySetup = {
        hasPin: state.hasSetupPin,
        hasBiometric: state.hasSetupBiometric,
        isLocked: false,
        lastUnlockTime: Date.now()
      };
      storeSecuritySetup(securitySetup);

      // Clear onboarding state
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);

      // Navigate to main app
      navigate('/app/home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setState({
      step: 'splash',
      hasCompletedWallet: false,
      hasVerifiedEmail: false,
      hasSetupPin: false,
      hasSetupBiometric: false,
      biometricSetup: false
    });
  };

  const isOnboardingComplete = () => {
    return state.hasCompletedWallet && 
           state.hasVerifiedEmail && 
           state.hasSetupPin;
  };

  const canProceedToEmail = () => {
    return state.hasCompletedWallet;
  };

  const canProceedToSecurity = () => {
    return state.hasCompletedWallet && state.hasVerifiedEmail;
  };

  return {
    state,
    setStep,
    setWalletInfo,
    setEmail,
    setVerificationCode,
    setReferralCode,
    markEmailVerified,
    setPinHash,
    markBiometricSetup,
    nextStep,
    previousStep,
    completeOnboarding,
    resetOnboarding,
    isOnboardingComplete,
    canProceedToEmail,
    canProceedToSecurity,
    updateState
  };
}