import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WalletInfo } from '@/utils/wallet';
import { SecuritySetup, getSecuritySetup, storeSecuritySetup } from '@/utils/security';
import { refreshSessionIfNeeded, withSessionRefresh } from '@/utils/sessionRefresh';
import { toast } from 'sonner';

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

  // Log loaded state for debugging
  useEffect(() => {
    console.log('[ONBOARDING] Loaded state:', {
      step: state.step,
      hasCompletedWallet: state.hasCompletedWallet,
      hasVerifiedEmail: state.hasVerifiedEmail,
      hasSetupPin: state.hasSetupPin,
      hasEmail: !!state.email,
      hasWallet: !!state.walletInfo
    });
  }, []);

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
      'referral-code',
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
      'referral-code',
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

      // CRITICAL: Refresh session before completing onboarding
      console.info('[ONBOARDING] Refreshing session before completion...');
      const sessionValid = await refreshSessionIfNeeded();
      
      if (!sessionValid) {
        console.error('[ONBOARDING] Session refresh failed!');
        toast.error('Your session has expired. Please sign in again.');
        
        // Preserve onboarding state for recovery
        localStorage.setItem('onboarding_recovery', JSON.stringify({
          ...state,
          recoveryTimestamp: Date.now()
        }));
        
        // Redirect to auth with recovery intent
        navigate('/auth?recover=true');
        return;
      }

      // Get refreshed session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.error('[ONBOARDING] No active session after refresh!');
        throw new Error('Session not found. Please sign in again.');
      }

      console.info('[ONBOARDING] Session verified and refreshed:', session.user.id);

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

      // Mark onboarding as complete in database with session refresh wrapper
      await withSessionRefresh(async () => {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            onboarding_completed_at: new Date().toISOString(),
            setup_complete: true
          })
          .eq('user_id', session.user.id);
        
        if (error) throw error;
      });

      console.info('[ONBOARDING] Profile updated successfully');

      // Clear onboarding state
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      localStorage.removeItem('onboarding_recovery');

      toast.success('Welcome! Your account is ready.');

      // Navigate to main app
      navigate('/app/home');
    } catch (error) {
      console.error('[ONBOARDING] Error completing onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
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