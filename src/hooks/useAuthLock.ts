import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';


interface LockState {
  isUnlocked: boolean;
  lastUnlockAt: number | null;
  failedAttempts: number;
  lockedUntil: number | null;
  biometricEnabled: boolean;
  requireOnActions: boolean;
  sessionLockMinutes: number;
  criticalOperationInProgress: boolean;
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
    sessionLockMinutes: 5,
    criticalOperationInProgress: false
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

        // Clear expired lock states
        if (newState.lockedUntil && newState.lockedUntil <= Date.now()) {
          newState.lockedUntil = null;
          newState.failedAttempts = 0;
        }

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
    const bcrypt = await import('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(pin, salt);
    return { hash, salt };
  }, []);

  // Verify PIN
  const verifyPin = useCallback(async (pin: string, storedHash: string): Promise<boolean> => {
    const bcrypt = await import('bcryptjs');
    return await bcrypt.compare(pin, storedHash);
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
    // Only block if still within lockout period (don't require user session for local PIN verification)
    if (lockState.lockedUntil && Date.now() < lockState.lockedUntil) {
      const remainingTime = Math.max(0, Math.ceil((lockState.lockedUntil - Date.now()) / 1000));
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

          // Restore Supabase session after successful PIN unlock
          try {
            console.log('[Session] Attempting refresh...');
            let { data, error } = await supabase.auth.refreshSession();
            
            // Retry once if failed
            if (error || !data.session) {
              console.log('[Session] Retry after 500ms...');
              await new Promise(resolve => setTimeout(resolve, 500));
              const retry = await supabase.auth.refreshSession();
              data = retry.data;
              error = retry.error;
            }
            
            if (error || !data.session) {
              console.log('[Session] ❌ Failed:', error?.message || 'No session');
            } else {
              console.log('[Session] ✅ Restored, user_id:', data.session.user.id);
              // Emit event for components to refresh data
              window.dispatchEvent(new CustomEvent('auth:session:restored', { 
                detail: { userId: data.session.user.id } 
              }));
            }
          } catch (err) {
            console.log('[Session] ❌ Exception:', err);
          }

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
    try {
      // Native platform (iOS/Android)
      if (Capacitor.isNativePlatform()) {
        const result = await BiometricAuth.checkBiometry();
        return result.isAvailable && result.biometryType !== BiometryType.none;
      }
      
      // Web: Check for WebAuthn support
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        return available;
      }
      
      return false;
    } catch (error) {
      console.log('Biometrics not available:', error);
      return false;
    }
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

      // Native platform (iOS/Android)
      if (Capacitor.isNativePlatform()) {
        try {
          await BiometricAuth.authenticate({
            reason: 'Unlock your wallet',
            cancelTitle: 'Cancel',
            allowDeviceCredential: true,
            iosFallbackTitle: 'Use PIN',
            androidTitle: 'Biometric Authentication',
            androidSubtitle: 'Place your finger or look at the camera',
            androidConfirmationRequired: false
          });

          // If we reach here, authentication succeeded
          await saveLockState({
            isUnlocked: true,
            lastUnlockAt: Date.now(),
            failedAttempts: 0,
            lockedUntil: null
          });

          // Restore Supabase session after biometric unlock
          try {
            console.log('[Session] Attempting refresh...');
            let { data, error } = await supabase.auth.refreshSession();
            
            // Retry once if failed
            if (error || !data.session) {
              console.log('[Session] Retry after 500ms...');
              await new Promise(resolve => setTimeout(resolve, 500));
              const retry = await supabase.auth.refreshSession();
              data = retry.data;
              error = retry.error;
            }
            
            if (error || !data.session) {
              console.log('[Session] ❌ Failed:', error?.message || 'No session');
            } else {
              console.log('[Session] ✅ Restored, user_id:', data.session.user.id);
              window.dispatchEvent(new CustomEvent('auth:session:restored', { 
                detail: { userId: data.session.user.id } 
              }));
            }
          } catch (err) {
            console.log('[Session] ❌ Exception:', err);
          }

          // Log successful biometric unlock
          if (user) {
            await supabase.from('login_audit').insert({
              user_id: user.id,
              event: 'bio_success',
              device_info: { userAgent: navigator.userAgent, platform: 'native' }
            });
          }

          return true;
        } catch (biometricError) {
          console.error('Native biometric failed:', biometricError);
          return false;
        }
      }

      // Web platform - simulate for preview
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

      // Restore Supabase session (web biometric)
      try {
        console.log('[Session] Attempting refresh...');
        let { data, error } = await supabase.auth.refreshSession();
        
        // Retry once if failed
        if (error || !data.session) {
          console.log('[Session] Retry after 500ms...');
          await new Promise(resolve => setTimeout(resolve, 500));
          const retry = await supabase.auth.refreshSession();
          data = retry.data;
          error = retry.error;
        }
        
        if (error || !data.session) {
          console.log('[Session] ❌ Failed:', error?.message || 'No session');
        } else {
          console.log('[Session] ✅ Restored, user_id:', data.session.user.id);
          window.dispatchEvent(new CustomEvent('auth:session:restored', { 
            detail: { userId: data.session.user.id } 
          }));
        }
      } catch (err) {
        console.log('[Session] ❌ Exception:', err);
      }

      // Log successful biometric unlock
      if (user) {
        await supabase.from('login_audit').insert({
          user_id: user.id,
          event: 'bio_success',
          device_info: { userAgent: navigator.userAgent, platform: 'web' }
        });
      }

      return true;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      // Log failed biometric attempt
      if (user) {
        await supabase.from('login_audit').insert({
          user_id: user.id,
          event: 'bio_failed',
          device_info: { userAgent: navigator.userAgent }
        });
      }

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

  // Check if unlock is required (session-based)
  const isUnlockRequired = useCallback(async (forSensitiveAction = false): Promise<boolean> => {
    // 1. FIRST: Check if Supabase session exists
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // If no session or error, REQUIRE unlock
    if (error || !session) {
      console.log('🔒 Lock required: No active session');
      return true;
    }
    
    // 2. Session exists - check if it's still valid by comparing with expiration
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at).getTime();
      if (Date.now() >= expiresAt) {
        console.log('🔒 Lock required: Session expired');
        return true;
      }
    }
    
    // 3. For sensitive actions, require recent unlock
    if (forSensitiveAction && lockState.requireOnActions) {
      if (!lockState.lastUnlockAt || Date.now() - lockState.lastUnlockAt > 60 * 1000) {
        console.log('🔒 Lock required: Sensitive action needs recent unlock');
        return true;
      }
    }
    
    // Session is active - no lock required
    console.log('✅ Session active, no lock required');
    return false;
  }, [lockState]);

  // Start critical operation (prevents auto-lock)
  const startCriticalOperation = useCallback(() => {
    setLockState(prev => ({ ...prev, criticalOperationInProgress: true }));
    console.log('🔒 Critical operation started - auto-lock disabled');
  }, []);

  // End critical operation (re-enables auto-lock)
  const endCriticalOperation = useCallback(() => {
    setLockState(prev => ({ ...prev, criticalOperationInProgress: false }));
    console.log('🔓 Critical operation ended - auto-lock re-enabled');
  }, []);

  // Update activity timestamp (extends session)
  const updateActivity = useCallback(() => {
    setLockState(prev => ({ ...prev, lastUnlockAt: Date.now() }));
  }, []);

  // Auto-lock check
  useEffect(() => {
    if (!user || !lockState.isUnlocked) return;

    const checkAutoLock = async () => {
      // Skip auto-lock if critical operation in progress
      if (lockState.criticalOperationInProgress) {
        console.log('⏸️  Auto-lock skipped - critical operation in progress');
        return;
      }

      if (await isUnlockRequired()) {
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
    saveLockState,
    startCriticalOperation,
    endCriticalOperation,
    updateActivity
  };
};

// Helper for onboarding: unlock without requiring PIN
export const unlockAfterOnboarding = async () => {
  const lockState = {
    isUnlocked: true,
    lastUnlockAt: Date.now(),
    failedAttempts: 0,
    lockedUntil: null,
    biometricEnabled: false,
    requireOnActions: true,
    sessionLockMinutes: 5,
    criticalOperationInProgress: false
  };
  
  localStorage.setItem('cryptoflow_lock_state', JSON.stringify(lockState));
  console.log('✅ Unlocked after onboarding completion');
};