import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuthUser } from '@/hooks/useAuthUser';
import { supabase } from '@/integrations/supabase/client';
import WalletChoiceScreen from './onboarding/WalletChoiceScreen';
import CreateWalletScreen from './onboarding/CreateWalletScreen';
import ImportWalletScreen from './onboarding/ImportWalletScreen';
import SuccessCelebrationScreen from './onboarding/SuccessCelebrationScreen';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';
import PinEntryDialog from '@/components/profile/PinEntryDialog';
import { useEncryptedWalletBackup } from '@/hooks/useEncryptedWalletBackup';
import { useToast } from '@/hooks/use-toast';

/**
 * OnboardingFlow - Post-authentication wallet setup
 * 
 * New Flow (after user signs up/logs in):
 * 1. /onboarding/wallet -> Wallet creation/import
 * 2. Complete -> /app/home
 */
const OnboardingFlow: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const { toast } = useToast();
  const { createBackup } = useEncryptedWalletBackup();
  const {
    state,
    setStep,
    setWalletInfo,
    setReferralCode,
    completeOnboarding
  } = useOnboarding();

  // State for PIN backup dialog
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<any>(null);

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

    // Redirect /onboarding/security to /app/home (security disabled)
    if (path === '/onboarding/security' || path.startsWith('/onboarding/security')) {
      navigate('/app/home', { replace: true });
      return;
    }

    // Map path to step, then only update when different to avoid loops
    let targetStep: typeof state.step | null = null;
    if (path === '/onboarding/wallet') {
      targetStep = 'wallet-choice';
    } else if (path === '/onboarding/wallet/create') {
      targetStep = 'create-wallet';
    } else if (path === '/onboarding/wallet/import') {
      targetStep = 'import-wallet';
    } else if (path.includes('/onboarding/success')) {
      targetStep = 'success';
    } else {
      // Default to wallet choice
      targetStep = 'wallet-choice';
    }

    if (targetStep && state.step !== targetStep) {
      setStep(targetStep as any);
    }
  }, [user, loading, navigate, setStep, state.step]);

  const handleWalletChoice = (choice: 'create' | 'import') => {
    setStep(choice + '-wallet' as any);
  };

  const handleWalletCreated = async (wallet: any) => {
    // Store wallet IMMEDIATELY to localStorage before anything else
    try {
      const { storeWallet, setWalletStorageUserId } = await import('@/utils/walletStorage');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser?.id) {
        setWalletStorageUserId(currentUser.id);
        storeWallet({
          address: wallet.address,
          privateKey: wallet.privateKey,
          seedPhrase: wallet.mnemonic,
          network: 'mainnet',
          balance: '0'
        }, currentUser.id);
        console.log('[ONBOARDING] Wallet stored immediately for user:', currentUser.id.slice(0, 8) + '...');
        
        // Also update the profile with wallet address
        await supabase
          .from('profiles')
          .update({ 
            wallet_address: wallet.address,
            wallet_addresses: {
              evm: { mainnet: wallet.address, bsc: wallet.address }
            }
          })
          .eq('user_id', currentUser.id);
      } else {
        console.warn('[ONBOARDING] No user found when storing wallet - using pending storage');
        const { storePendingWallet } = await import('@/utils/walletStorage');
        storePendingWallet({
          address: wallet.address,
          privateKey: wallet.privateKey,
          seedPhrase: wallet.mnemonic,
          network: 'mainnet',
          balance: '0'
        });
      }
    } catch (error) {
      console.error('[ONBOARDING] Error storing wallet:', error);
    }
    
    setWalletInfo(wallet);
    // Show PIN dialog to create encrypted backup
    setPendingWallet(wallet);
    setShowPinDialog(true);
  };

  const handlePinSubmit = async (pin: string): Promise<boolean> => {
    if (!pendingWallet) return false;
    
    try {
      const success = await createBackup(
        pendingWallet.mnemonic,
        pendingWallet.address,
        pin
      );
      
      if (success) {
        toast({
          title: "Wallet Backed Up",
          description: "Your wallet is now securely encrypted and backed up.",
        });
        // Proceed to success after backup
        setShowPinDialog(false);
        setPendingWallet(null);
        setStep('success');
        navigate('/onboarding/success');
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ONBOARDING] Backup failed:', error);
      return false;
    }
  };

  const handleSkipBackup = () => {
    setShowPinDialog(false);
    setPendingWallet(null);
    setStep('success');
    navigate('/onboarding/success');
  };
  
  const handleWalletImported = async (wallet: any) => {
    // Store wallet IMMEDIATELY to localStorage
    try {
      const { storeWallet, setWalletStorageUserId } = await import('@/utils/walletStorage');
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (currentUser?.id) {
        setWalletStorageUserId(currentUser.id);
        storeWallet({
          address: wallet.address,
          privateKey: wallet.privateKey,
          seedPhrase: wallet.mnemonic,
          network: 'mainnet',
          balance: '0'
        }, currentUser.id);
        console.log('[ONBOARDING] Imported wallet stored for user:', currentUser.id.slice(0, 8) + '...');
        
        // Update profile with wallet address
        await supabase
          .from('profiles')
          .update({ 
            wallet_address: wallet.address,
            wallet_addresses: {
              evm: { mainnet: wallet.address, bsc: wallet.address }
            }
          })
          .eq('user_id', currentUser.id);
      }
    } catch (error) {
      console.error('[ONBOARDING] Error storing imported wallet:', error);
    }
    
    setWalletInfo(wallet);
    // Show PIN dialog to create encrypted backup
    setPendingWallet(wallet);
    setShowPinDialog(true);
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
  const renderContent = () => {
    switch (state.step) {
      case 'wallet-choice':
        return (
          <WalletChoiceScreen
            onCreateWallet={() => { setStep('create-wallet'); navigate('/onboarding/wallet/create'); }}
            onImportWallet={() => { setStep('import-wallet'); navigate('/onboarding/wallet/import'); }}
            onBack={() => navigate('/auth/signup')}
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
            onBack={() => navigate('/auth/signup')}
          />
        );
    }
  };

  return (
    <>
      {renderContent()}
      <PinEntryDialog
        open={showPinDialog}
        onOpenChange={(open) => {
          if (!open) handleSkipBackup();
        }}
        onSubmit={handlePinSubmit}
        title="Secure Your Wallet"
        description="Create a 6-digit PIN to encrypt your wallet backup. You'll need this PIN to restore your wallet on other devices."
        isNewPin={true}
      />
    </>
  );
};

export default OnboardingFlow;
