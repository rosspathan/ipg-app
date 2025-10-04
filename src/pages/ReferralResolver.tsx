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
        console.warn('No code provided, redirecting to welcome');
        if (mounted) navigate('/welcome', { replace: true });
        return;
      }

      try {
        // Store pending referral immediately (before DB lookup)
        const pendingRef = {
          code: code.toUpperCase(),
          sponsorId: '', // Will be filled after lookup
          timestamp: Date.now()
        };
        
        console.log('Looking up referral code in database...');
        
        // Look up referral code to get sponsor user_id
        const { data: codeData, error } = await supabase
          .from('referral_codes')
          .select('user_id')
          .eq('code', code.toUpperCase())
          .maybeSingle();

        if (error) {
          console.error('Database error looking up code:', error);
          // Still redirect to welcome with ref param even if DB lookup fails
          if (mounted) navigate(`/welcome?ref=${code.toUpperCase()}`, { replace: true });
          return;
        }

        if (codeData?.user_id) {
          // Update pending referral with sponsor ID
          pendingRef.sponsorId = codeData.user_id;
          localStorage.setItem('ismart_pending_ref', JSON.stringify(pendingRef));
          console.log('✅ Referral code found, sponsor:', codeData.user_id);
        } else {
          console.warn('Referral code not found in database:', code);
        }

        // Always redirect to welcome with ref param
        if (mounted) {
          console.log('Redirecting to welcome with ref param');
          navigate(`/welcome?ref=${code.toUpperCase()}`, { replace: true });
        }
      } catch (error) {
        console.error('Error resolving referral:', error);
        if (mounted) navigate(`/welcome?ref=${code.toUpperCase()}`, { replace: true });
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
