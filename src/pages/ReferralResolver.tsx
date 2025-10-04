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
      console.log('🔗 Resolving referral sponsorID:', code);
      
      if (!code) {
        console.warn('No sponsorID provided, redirecting to welcome');
        if (mounted) navigate('/welcome', { replace: true });
        return;
      }

      try {
        // Code is now the sponsor's user_id directly
        const sponsorId = code;
        
        console.log('Using sponsorID directly:', sponsorId);
        
        // Validate that sponsor exists in the database
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('user_id', sponsorId)
          .maybeSingle();

        if (error) {
          console.error('Database error validating sponsor:', error);
        }

        // Store pending referral with sponsor ID
        const pendingRef = {
          code: sponsorId,
          sponsorId: sponsorId,
          timestamp: Date.now()
        };
        
        localStorage.setItem('ismart_pending_ref', JSON.stringify(pendingRef));
        
        if (profileData) {
          console.log('✅ Valid sponsor found:', sponsorId);
        } else {
          console.warn('⚠️ Sponsor not found, but storing referral anyway');
        }

        // Always redirect to welcome with sponsor ID
        if (mounted) {
          console.log('Redirecting to welcome with sponsorID');
          navigate(`/welcome?ref=${sponsorId}`, { replace: true });
        }
      } catch (error) {
        console.error('Error resolving referral:', error);
        if (mounted) navigate(`/welcome?ref=${code}`, { replace: true });
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
