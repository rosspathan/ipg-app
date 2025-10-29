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
        // Check if it's a UUID (direct user_id reference)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        let data = null;
        let error = null;

        if (uuidRegex.test(debouncedCode)) {
          // Direct UUID lookup
          const result = await supabase
            .from('profiles')
            .select('user_id, username, display_name')
            .eq('user_id', debouncedCode)
            .maybeSingle();
          data = result.data;
          error = result.error;
        } else {
          // Legacy short code lookup
          const result = await supabase
            .from('profiles')
            .select('user_id, username, display_name')
            .eq('referral_code', debouncedCode.toUpperCase())
            .maybeSingle();
          data = result.data;
          error = result.error;
        }

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
