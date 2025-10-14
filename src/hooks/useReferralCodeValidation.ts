import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from 'use-debounce';

interface ValidationResult {
  isValid: boolean;
  sponsorId: string | null;
  sponsorUsername: string | null;
  loading: boolean;
  error: string | null;
}

export function useReferralCodeValidation(code: string): ValidationResult {
  const [result, setResult] = useState<ValidationResult>({
    isValid: false,
    sponsorId: null,
    sponsorUsername: null,
    loading: false,
    error: null,
  });

  const [debouncedCode] = useDebounce(code.trim().toUpperCase(), 500);

  useEffect(() => {
    if (!debouncedCode) {
      setResult({
        isValid: false,
        sponsorId: null,
        sponsorUsername: null,
        loading: false,
        error: null,
      });
      return;
    }

    const validateCode = async () => {
      setResult(prev => ({ ...prev, loading: true, error: null }));

      try {
        // Check if code exists in profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, username, display_name')
          .eq('referral_code', debouncedCode)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Check if user is trying to refer themselves
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.id === data.user_id) {
            setResult({
              isValid: false,
              sponsorId: null,
              sponsorUsername: null,
              loading: false,
              error: 'You cannot use your own referral code',
            });
            return;
          }

          setResult({
            isValid: true,
            sponsorId: data.user_id,
            sponsorUsername: data.display_name || data.username || 'User',
            loading: false,
            error: null,
          });
        } else {
          setResult({
            isValid: false,
            sponsorId: null,
            sponsorUsername: null,
            loading: false,
            error: 'Invalid referral code',
          });
        }
      } catch (error) {
        console.error('Referral code validation error:', error);
        setResult({
          isValid: false,
          sponsorId: null,
          sponsorUsername: null,
          loading: false,
          error: 'Failed to validate code',
        });
      }
    };

    validateCode();
  }, [debouncedCode]);

  return result;
}
