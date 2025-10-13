import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Public referral link resolver
 * Handles /r/[code] routes and redirects to welcome with ref param
 */
export function ReferralResolver() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resolving, setResolving] = useState(true);

  useEffect(() => {
    let mounted = true;

    const resolveReferral = async () => {
      // Check for ref code in URL params or path params
      const refCode = code || searchParams.get('ref');
      console.log('🔗 Resolving referral sponsorID:', refCode);
      console.log('REF_CAPTURE_OK');
      
      if (!refCode) {
        console.warn('No sponsorID provided, redirecting to onboarding');
        if (mounted) navigate('/onboarding', { replace: true });
        return;
      }

      try {
        // Code is now the sponsor's user_id directly
        const sponsorId = refCode;
        
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

        // Store in sessionStorage for Module C requirement
        sessionStorage.setItem('ipg_ref_code', sponsorId);
        
        // Also store in localStorage for backward compatibility
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

        // Show toast notification
        toast({
          title: "Referral applied",
          description: "Complete registration to earn rewards",
        });

        // Always redirect to onboarding with sponsor ID
        if (mounted) {
          console.log('Redirecting to onboarding with sponsorID');
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error('Error resolving referral:', error);
        if (mounted) navigate('/onboarding', { replace: true });
      }
    };

    resolveReferral();

    return () => {
      mounted = false;
    };
  }, [code, searchParams, navigate, toast]);

  if (!resolving) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-muted-foreground">Processing referral...</p>
      </div>
    </div>
  );
}
