import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useDebouncedCallback } from 'use-debounce';

interface PhoneValidationResult {
  available: boolean;
  error?: string;
  status?: string;
}

export const usePhoneValidation = () => {
  const { user } = useAuthUser();
  const [isChecking, setIsChecking] = useState(false);
  const [validationResult, setValidationResult] = useState<PhoneValidationResult | null>(null);

  const checkPhoneAvailability = useCallback(async (phone: string): Promise<PhoneValidationResult> => {
    if (!phone || phone.trim().length < 8) {
      return { available: true };
    }
    // Normalize same way as server (digits + leading +)
    const normalized = phone.replace(/[^0-9+]/g, '');

    try {
      const { data, error } = await (supabase.rpc as any)('check_kyc_phone_available', {
        p_phone_number: normalized,
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('[PhoneValidation] RPC error:', error);
        // Surface a clear retry hint instead of silently passing
        return { available: false, error: 'Could not verify phone number. Please retry.' };
      }

      if (typeof data === 'object' && data !== null && 'available' in data) {
        return data as PhoneValidationResult;
      }
      return { available: true };
    } catch (err) {
      console.error('[PhoneValidation] Error:', err);
      return { available: false, error: 'Network error checking phone. Please retry.' };
    }
  }, [user?.id]);

  const debouncedCheck = useDebouncedCallback(
    async (phone: string) => {
      setIsChecking(true);
      const result = await checkPhoneAvailability(phone);
      setValidationResult(result);
      setIsChecking(false);
    },
    500 // 500ms debounce
  );

  const validatePhone = useCallback((phone: string) => {
    setValidationResult(null);
    debouncedCheck(phone);
  }, [debouncedCheck]);

  const resetValidation = useCallback(() => {
    setValidationResult(null);
    setIsChecking(false);
  }, []);

  return {
    isChecking,
    validationResult,
    validatePhone,
    resetValidation,
    checkPhoneAvailability
  };
};
