import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import * as bcrypt from 'bcryptjs';

interface LockState {
  isUnlocked: boolean;
  lastUnlockAt: number | null;
  failedAttempts: number;
  lockedUntil: number | null;
  biometricEnabled: boolean;
  requireOnActions: boolean;
  sessionLockMinutes: number;
}

const STORAGE_KEY = 'cryptoflow_lock_state';
const MAX_ATTEMPTS = 5;
const COOLDOWN_DURATION = 30 * 1000; // 30 seconds
const SECURITY_FAILURE_THRESHOLD = 10;

export const useAuthLock = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [lockState, setLockState] = useState<LockState>({
    isUnlocked: false,
    lastUnlockAt: null,
    failedAttempts: 0,
    lockedUntil: null,
    biometricEnabled: false,
    requireOnActions: true,
    sessionLockMinutes: 5
  });

  // Load lock state from localStorage and sync with database
  const loadLockState = useCallback(async () => {
    if (!user) return;

    // Load from localStorage first for quick access
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLockState(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Failed to parse lock state:', error);
      }
    }

    // Sync with database
    try {
      const [securityResult, settingsResult] = await Promise.all([
        supabase.from('security').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('settings_user').select('*').eq('user_id', user.id).maybeSingle()
      ]);

      if (securityResult.data || settingsResult.data) {
        const newState: Partial<LockState> = {
          biometricEnabled: securityResult.data?.biometric_enabled || false,
          failedAttempts: securityResult.data?.failed_attempts || 0,
          lockedUntil: securityResult.data?.locked_until ? new Date(securityResult.data.locked_until).getTime() : null,
          requireOnActions: settingsResult.data?.require_unlock_on_actions ?? true,
          sessionLockMinutes: settingsResult.data?.session_lock_minutes || 5
        };

        setLockState(prev => {
          const updated = { ...prev, ...newState };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to load lock state from database:', error);
    }
  }, [user]);

  // Save lock state to localStorage and database
  const saveLockState = useCallback(async (updates: Partial<LockState>) => {
    if (!user) return;

    const newState = { ...lockState, ...updates };
    setLockState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

    // Save to database
    try {
      const { error: securityError } = await supabase
        .from('security')
        .upsert({
          user_id: user.id,
          failed_attempts: newState.failedAttempts,
          locked_until: newState.lockedUntil ? new Date(newState.lockedUntil).toISOString() : null,
          last_unlock_at: newState.lastUnlockAt ? new Date(newState.lastUnlockAt).toISOString() : null,
          biometric_enabled: newState.biometricEnabled
        }, { onConflict: 'user_id' });

      const { error: settingsError } = await supabase
        .from('settings_user')
        .upsert({
          user_id: user.id,
          require_unlock_on_actions: newState.requireOnActions,
          session_lock_minutes: newState.sessionLockMinutes
        }, { onConflict: 'user_id' });

      if (securityError || settingsError) {
        console.error('Failed to save lock state:', { securityError, settingsError });
      }
    } catch (error) {
      console.error('Failed to save lock state to database:', error);
    }
  }, [user, lockState]);

  // Hash PIN with salt
  const hashPin = useCallback(async (pin: string): Promise<{ hash: string; salt: string }> => {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(pin, salt);
    return { hash, salt };
  }, []);

  // Verify PIN
  const verifyPin = useCallback(async (pin: string, storedHash: string): Promise<boolean> => {
    return bcrypt.compare(pin, storedHash);
  }, []);

  // Set PIN (for initial setup or change)
  const setPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!/^\d{6}$/.test(pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 6 digits",
        variant: "destructive"
      });
      return false;
    }

    // Allow PIN setting even without session for onboarding
    if (!user) {
      console.log('Setting PIN without session - will be synced after login');
      return true; // Allow local storage handling
    }

    try {
      const { hash, salt } = await hashPin(pin);
      
      const { error } = await supabase
        .from('security')
        .upsert({
          user_id: user.id,
          pin_hash: hash,
          pin_salt: salt,
          pin_set: true
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Log security event
      await supabase.from('login_audit').insert({
        user_id: user.id,
        event: 'pin_set',
        device_info: { userAgent: navigator.userAgent }
      });

      toast({
        title: "PIN Set Successfully",
        description: "Your PIN has been securely stored"
      });

      return true;
    } catch (error) {
      console.error('Failed to set PIN:', error);
      toast({
        title: "Error",
        description: "Failed to set PIN. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, hashPin, toast]);

  // Unlock with PIN (supports both database and local verification)
  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    if (!user || lockState.lockedUntil && Date.now() < lockState.lockedUntil) {
      const remainingTime = Math.ceil((lockState.lockedUntil! - Date.now()) / 1000);
      toast({
        title: "Account Locked",
        description: `Please wait ${remainingTime} seconds before trying again`,
        variant: "destructive"
      });
      return false;
    }

    try {
      let isValid = false;

      // First try database verification
      if (user) {
        const { data: security } = await supabase
          .from('security')
          .select('pin_hash')
          .eq('user_id', user.id)
          .maybeSingle();

        if (security?.pin_hash) {
          isValid = await verifyPin(pin, security.pin_hash);
        }
      }

      // If no database PIN or failed, try local verification
      if (!isValid) {
        const { verifyLocalPin } = await import('@/utils/localSecurityStorage');
        isValid = await verifyLocalPin(pin);
      }

      if (isValid) {
        await saveLockState({
          isUnlocked: true,
          lastUnlockAt: Date.now(),
          failedAttempts: 0,
          lockedUntil: null
        });

        // Log successful unlock if user is logged in
        if (user) {
          await supabase.from('login_audit').insert({
            user_id: user.id,
            event: 'pin_success',
            device_info: { userAgent: navigator.userAgent }
          });
        }

        return true;
      } else {
        const newFailedAttempts = lockState.failedAttempts + 1;
        let lockedUntil = null;

        if (newFailedAttempts >= MAX_ATTEMPTS) {
          lockedUntil = Date.now() + COOLDOWN_DURATION;
        }

        await saveLockState({
          failedAttempts: newFailedAttempts,
          lockedUntil
        });

        // Log failed attempt if user is logged in
        if (user) {
          await supabase.from('login_audit').insert({
            user_id: user.id,
            event: 'pin_failed',
            device_info: { userAgent: navigator.userAgent }
          });
        }

        if (newFailedAttempts >= SECURITY_FAILURE_THRESHOLD) {
          toast({
            title: "Security Alert",
            description: "Too many failed attempts. Please reset your PIN using your recovery phrase.",
            variant: "destructive"
          });
          navigate('/recovery/verify');
          return false;
        }

        const remainingAttempts = MAX_ATTEMPTS - newFailedAttempts;
        toast({
          title: "Incorrect PIN",
          description: lockedUntil 
            ? "Too many attempts. Account temporarily locked."
            : `${remainingAttempts} attempts remaining`,
          variant: "destructive"
        });

        return false;
      }
    } catch (error) {
      console.error('Failed to unlock with PIN:', error);
      toast({
        title: "Error",
        description: "Failed to verify PIN. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [user, lockState, verifyPin, saveLockState, toast, navigate]);

  // Check if biometrics are available
  const checkBiometricAvailability = useCallback(async (): Promise<boolean> => {
    // Web: Check for WebAuthn support
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
      } catch (error) {
        console.log('Biometrics not available:', error);
        return false;
      }
    }
    
    // Mobile: This would integrate with Expo LocalAuthentication
    // For now, return false for web preview
    return false;
  }, []);

  // Unlock with biometrics
  const unlockWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!lockState.biometricEnabled) {
      toast({
        title: "Biometrics Disabled",
        description: "Please enable biometrics in security settings",
        variant: "destructive"
      });
      return false;
    }

    try {
      const isAvailable = await checkBiometricAvailability();
      if (!isAvailable) {
        toast({
          title: "Biometrics Unavailable",
          description: "Biometric authentication is not available on this device",
          variant: "destructive"
        });
        return false;
      }

      // For web preview, simulate biometric auth
      toast({
        title: "Biometric Auth",
        description: "Simulated biometric authentication (web preview)",
      });

      await saveLockState({
        isUnlocked: true,
        lastUnlockAt: Date.now(),
        failedAttempts: 0,
        lockedUntil: null
      });

      // Log successful biometric unlock
      await supabase.from('login_audit').insert({
        user_id: user.id,
        event: 'bio_success',
        device_info: { userAgent: navigator.userAgent }
      });

      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      // Log failed biometric attempt
      await supabase.from('login_audit').insert({
        user_id: user.id,
        event: 'bio_failed',
        device_info: { userAgent: navigator.userAgent }
      });

      toast({
        title: "Biometric Failed",
        description: "Please try again or use your PIN",
        variant: "destructive"
      });
      return false;
    }
  }, [lockState.biometricEnabled, checkBiometricAvailability, saveLockState, toast, user]);

  // Lock the app
  const lock = useCallback(async () => {
    await saveLockState({
      isUnlocked: false,
      lastUnlockAt: null
    });
    navigate('/auth/lock');
  }, [saveLockState, navigate]);

  // Check if unlock is required
  const isUnlockRequired = useCallback((forSensitiveAction = false): boolean => {
    if (!lockState.isUnlocked) return true;
    
    if (forSensitiveAction) {
      if (!lockState.requireOnActions) return false;
      // Require unlock if last unlock was more than 60 seconds ago
      if (lockState.lastUnlockAt && Date.now() - lockState.lastUnlockAt > 60 * 1000) {
        return true;
      }
    } else {
      // Check session timeout
      if (lockState.lastUnlockAt && lockState.sessionLockMinutes > 0) {
        const timeoutMs = lockState.sessionLockMinutes * 60 * 1000;
        if (Date.now() - lockState.lastUnlockAt > timeoutMs) {
          return true;
        }
      }
    }
    
    return false;
  }, [lockState]);

  // Auto-lock check
  useEffect(() => {
    if (!user || !lockState.isUnlocked) return;

    const checkAutoLock = () => {
      if (isUnlockRequired()) {
        lock();
      }
    };

    const interval = setInterval(checkAutoLock, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [user, lockState, isUnlockRequired, lock]);

  // Load initial state
  useEffect(() => {
    loadLockState();
  }, [loadLockState]);

  return {
    lockState,
    setPin,
    unlockWithPin,
    unlockWithBiometrics,
    lock,
    isUnlockRequired,
    checkBiometricAvailability,
    saveLockState
  };
};