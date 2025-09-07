import { useCallback, useState } from 'react';
import { useAuthLock } from '@/hooks/useAuthLock';
import { useToast } from '@/hooks/use-toast';

export const useSensitiveAction = () => {
  const { isUnlockRequired, unlockWithPin, unlockWithBiometrics, lockState } = useAuthLock();
  const { toast } = useToast();
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const executeWithUnlock = useCallback(async (action: () => void, actionName?: string) => {
    if (!isUnlockRequired(true)) {
      // No unlock required, execute immediately
      action();
      return;
    }

    // Store the action to execute after unlock
    setPendingAction(() => action);
    setShowUnlockDialog(true);

    if (actionName) {
      toast({
        title: "Security Check Required",
        description: `Please verify your identity to ${actionName}`,
      });
    }
  }, [isUnlockRequired, toast]);

  const handleUnlockSuccess = useCallback(() => {
    setShowUnlockDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const handleUnlockCancel = useCallback(() => {
    setShowUnlockDialog(false);
    setPendingAction(null);
  }, []);

  // Simple unlock dialog component creator
  const createUnlockDialog = useCallback(() => {
    return {
      isOpen: showUnlockDialog,
      onClose: handleUnlockCancel,
      onPinUnlock: unlockWithPin,
      onBiometricUnlock: unlockWithBiometrics,
      biometricEnabled: lockState.biometricEnabled,
      onSuccess: handleUnlockSuccess
    };
  }, [showUnlockDialog, handleUnlockCancel, unlockWithPin, unlockWithBiometrics, lockState.biometricEnabled, handleUnlockSuccess]);

  return {
    executeWithUnlock,
    showUnlockDialog,
    setShowUnlockDialog,
    handleUnlockCancel,
    createUnlockDialog
  };
};