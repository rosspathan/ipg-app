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

interface ValidationOptions {
  ignoreSelfReferral?: boolean;
}

export function useReferralCodeValidation(code: string, options?: ValidationOptions): ValidationResult {
  const [result, setResult] = useState<ValidationResult>({
    isValid: false,
    sponsorId: null,
    sponsorUsername: null,
    loading: false,
    error: null,
  });

  const [debouncedCode] = useDebounce(code.trim(), 500);

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
        // Use the safe lookup function instead of direct table query
        const { data, error } = await supabase
          .rpc('lookup_user_by_referral_code', {
            p_referral_code: debouncedCode
          })
          .maybeSingle();

        if (error) throw error;

        if (data) {
          // Check if user is trying to refer themselves (skip during signup)
          if (!options?.ignoreSelfReferral) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user && session.user.id === data.user_id) {
              setResult({
                isValid: false,
                sponsorId: null,
                sponsorUsername: null,
                loading: false,
                error: 'You cannot use your own referral code',
              });
              return;
            }
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
  }, [debouncedCode, options?.ignoreSelfReferral]);

  return result;
}
