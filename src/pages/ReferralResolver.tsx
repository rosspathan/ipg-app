import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public referral link resolver
 * Handles /r/[code] routes and redirects to welcome with ref param
 */
export function ReferralResolver() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let mounted = true;

    const resolveReferral = async () => {
      console.log('🔗 Resolving referral code:', code);
      
      if (!code) {
        console.warn('No referral code provided, redirecting to landing');
        if (mounted) navigate('/', { replace: true });
        return;
      }

      try {
        // Validate that referral code exists
        const { data: referralCodeData, error } = await supabase
          .from('referral_codes')
          .select('user_id, code')
          .eq('code', code)
          .maybeSingle();

        if (error) {
          console.error('Database error validating referral code:', error);
        }

        // Store pending referral code
        localStorage.setItem('pending_referral', code);
        
        if (referralCodeData) {
          console.log('✅ Valid referral code found:', code);
        } else {
          console.warn('⚠️ Referral code not found, but storing anyway');
        }

        // Redirect to registration with referral code in URL
        if (mounted) {
          console.log('Redirecting to registration with referral code');
          navigate(`/auth/register?ref=${code}`, { replace: true });
        }
      } catch (error) {
        console.error('Error resolving referral:', error);
        if (mounted) navigate(`/auth/register?ref=${code}`, { replace: true });
      }
    };

    resolveReferral();

    return () => {
      mounted = false;
    };
  }, [code, navigate]);

  if (!resolving) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Processing referral link...</p>
      </div>
    </div>
  );
}
