import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public referral link resolver
 * Handles /r/[code] routes and redirects to welcome with ref param
 */
export function ReferralResolver() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const resolveReferral = async () => {
      if (!code) {
        navigate('/welcome');
        return;
      }

      try {
        // Look up referral code to get sponsor user_id
        const { data: codeData, error } = await supabase
          .from('referral_codes')
          .select('user_id')
          .eq('code', code.toUpperCase())
          .maybeSingle();

        if (error || !codeData) {
          console.warn('Referral code not found:', code);
          navigate('/welcome');
          return;
        }

        // Store pending referral in localStorage
        const pendingRef = {
          code: code.toUpperCase(),
          sponsorId: codeData.user_id,
          timestamp: Date.now()
        };
        localStorage.setItem('ismart_pending_ref', JSON.stringify(pendingRef));

        // Redirect to welcome with ref param
        navigate(`/welcome?ref=${code.toUpperCase()}`);
      } catch (error) {
        console.error('Error resolving referral:', error);
        navigate('/welcome');
      }
    };

    resolveReferral();
  }, [code, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-muted-foreground">Redirecting...</div>
    </div>
  );
}
