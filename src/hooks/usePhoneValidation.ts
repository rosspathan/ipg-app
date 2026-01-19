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
      return { available: true }; // Don't check very short inputs
    }

    try {
      // Using any for RPC call as the function is newly added
      const { data, error } = await (supabase.rpc as any)('check_kyc_phone_available', {
        p_phone_number: phone,
        p_user_id: user?.id || null
      });

      if (error) {
        console.error('[PhoneValidation] RPC error:', error);
        return { available: true }; // Fail open - let backend handle
      }

      // Parse the response safely
      if (typeof data === 'object' && data !== null && 'available' in data) {
        return data as PhoneValidationResult;
      }
      return { available: true };
    } catch (err) {
      console.error('[PhoneValidation] Error:', err);
      return { available: true }; // Fail open
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
