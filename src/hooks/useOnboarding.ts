import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WalletInfo } from '@/utils/wallet';
import { SecuritySetup, getSecuritySetup, storeSecuritySetup } from '@/utils/security';
import { refreshSessionIfNeeded, withSessionRefresh } from '@/utils/sessionRefresh';
import { toast } from 'sonner';
import { useWeb3 } from '@/contexts/Web3Context';

export type OnboardingStep = 
  | 'splash'
  | 'welcome'
  | 'features'
  | 'security-intro'
  | 'support-intro'
  | 'auth-signup'             // NEW: Sign up/login screen
  | 'email-verification-otp'  // NEW: OTP verification
  | 'wallet-choice'
  | 'create-wallet'
  | 'import-wallet'
  | 'verify-wallet-email'
  | 'wallet-connect'
  | 'email-input'
  | 'email-verification'
  | 'pin-setup'
  | 'biometric-setup'
  | 'success'
  | 'complete';

export interface OnboardingState {
  step: OnboardingStep;
  userId?: string;                // NEW: Store Supabase user ID after auth
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
  const { setWalletFromOnboarding } = useWeb3();
  
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

  const setUserId = (userId: string) => {
    updateState({ userId });
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
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Onboarding completion timeout')), 10000)
    );

    const actualCompletion = async () => {
      if (!state.walletInfo || !state.email || !state.pinHash) {
        throw new Error('Missing required onboarding data');
      }

      // Session is already established - just verify it exists
      console.info('[ONBOARDING] Verifying session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.error('[ONBOARDING] No active session found!');
        toast.error('Session lost. Please sign in again.');
        navigate('/auth?recover=true');
        return;
      }

      console.info('[ONBOARDING] Session verified:', session.user.id);

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

      // Capture referral if exists
      if (state.referralCode && state.sponsorId) {
        try {
          const { captureReferralAfterEmailVerify } = await import('@/utils/referralCapture');
          await captureReferralAfterEmailVerify(session.user.id);
        } catch (error) {
          console.error('[ONBOARDING] Failed to capture referral:', error);
          // Don't block onboarding completion for referral errors
        }
      }

      // Mark onboarding as complete in database with session refresh wrapper
      await withSessionRefresh(async () => {
        const updateData: any = { 
          onboarding_completed_at: new Date().toISOString(),
          setup_complete: true
        };
        
        // Save wallet address if available
        if (state.walletInfo?.address) {
          updateData.wallet_address = state.walletInfo.address;
          updateData.wallet_addresses = {
            evm: {
              mainnet: state.walletInfo.address,
              bsc: state.walletInfo.address
            }
          };
          console.info('[ONBOARDING] Saving wallet address:', state.walletInfo.address);
        }
        
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', session.user.id);
        
        if (error) throw error;
      });

      console.info('[ONBOARDING] Profile updated successfully');

      // Store wallet in localStorage for immediate access
      if (state.walletInfo) {
        console.info('[ONBOARDING] Storing wallet in localStorage...');
        const walletData = {
          address: state.walletInfo.address,
          privateKey: state.walletInfo.privateKey,
          seedPhrase: state.walletInfo.mnemonic,
          network: 'mainnet',
          balance: '0'
        };
        localStorage.setItem('cryptoflow_wallet', JSON.stringify(walletData));
        
        // Connect wallet to Web3Context
        console.info('[ONBOARDING] Connecting wallet to Web3Context...');
        setWalletFromOnboarding(state.walletInfo);
      }

      // Clear onboarding state
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
      localStorage.removeItem('onboarding_recovery');
      
      // Reset in-memory state
      setState({
        step: 'splash',
        email: undefined,
        userId: undefined,
        verificationCode: undefined,
        walletInfo: undefined,
        pinHash: undefined,
        biometricSetup: false,
        referralCode: undefined,
        sponsorId: undefined,
        hasCompletedWallet: false,
        hasVerifiedEmail: false,
        hasSetupPin: false,
        hasSetupBiometric: false
      });

      toast.success('Welcome! Your account is ready.');
    };

    try {
      await Promise.race([actualCompletion(), timeoutPromise]);
      
      // Unlock app before navigation
      const { unlockAfterOnboarding } = await import('@/hooks/useAuthLock');
      await unlockAfterOnboarding();
      
      // Navigate to return path or main app
      const returnPath = localStorage.getItem('ipg_return_path');
      localStorage.removeItem('ipg_return_path');
      navigate(returnPath || '/app/home', { replace: true });
    } catch (error) {
      console.error('[ONBOARDING] Error, but continuing to app:', error);
      toast('Setup completed with warnings');
      
      // Still try to unlock and navigate
      try {
        const { unlockAfterOnboarding } = await import('@/hooks/useAuthLock');
        await unlockAfterOnboarding();
      } catch (unlockError) {
        console.error('[ONBOARDING] Failed to unlock:', unlockError);
      }
      
      // Force navigation to return path or home
      const returnPath = localStorage.getItem('ipg_return_path');
      localStorage.removeItem('ipg_return_path');
      navigate(returnPath || '/app/home', { replace: true });
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
    setUserId,                   // NEW
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